use crate::commands::filesystem::canonicalize_approved_path;
use crate::error::AppError;
use crate::media::waveform::{
    delete_cache, levels_from_finest, parse_probe_audio_metadata, read_level, read_meta,
    write_cache, ComputedLevel, FinestLevelAccumulator, WaveformLevelData, WaveformMeta,
    WAVEFORM_LEVEL_SAMPLES,
};
use crate::state::{AppState, WaveformJobState};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use tokio::io::{AsyncReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WaveformProgress {
    media_id: String,
    fraction: f64,
}

fn cache_root(state: &AppState) -> PathBuf {
    state
        .active_data_directory
        .read()
        .join("cache")
        .join("waveform")
}

fn executable(app: &AppHandle, name: &str) -> Result<PathBuf, AppError> {
    let env_name = format!("PAWCAST_{}", name.to_ascii_uppercase());
    if let Some(path) = std::env::var_os(env_name) {
        return Ok(PathBuf::from(path));
    }
    if cfg!(debug_assertions) {
        return Ok(PathBuf::from(name));
    }
    let executable_name = format!("{name}{}", std::env::consts::EXE_SUFFIX);
    if let Some(sibling) = std::env::current_exe()
        .ok()
        .and_then(|path| {
            path.parent()
                .map(|directory| directory.join(&executable_name))
        })
        .filter(|path| path.is_file())
    {
        return Ok(sibling);
    }
    let resources = app
        .path()
        .resource_dir()
        .map_err(|error| AppError::io("sidecar_path", error))?;
    let direct = resources.join(&executable_name);
    if direct.is_file() {
        return Ok(direct);
    }
    let prefix = format!("{name}-");
    if let Ok(entries) = std::fs::read_dir(&resources) {
        if let Some(path) = entries.flatten().map(|entry| entry.path()).find(|path| {
            path.file_name()
                .and_then(|value| value.to_str())
                .is_some_and(|file| file.starts_with(&prefix))
        }) {
            return Ok(path);
        }
    }
    Err(AppError::new(
        "sidecar_missing",
        format!("Required {name} media tool is unavailable"),
    )
    .operation("waveform_analyze"))
}

async fn probe(
    app: &AppHandle,
    file: &Path,
) -> Result<crate::media::waveform::ProbeAudioMetadata, AppError> {
    let output = Command::new(executable(app, "ffprobe")?)
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
        ])
        .arg(file)
        .output()
        .await
        .map_err(|error| AppError::io("ffprobe", error))?;
    if !output.status.success() {
        return Err(
            AppError::new("ffprobe_failed", "The media file could not be inspected")
                .operation("waveform_analyze"),
        );
    }
    let json: serde_json::Value = serde_json::from_slice(&output.stdout).map_err(|_| {
        AppError::new(
            "ffprobe_invalid_output",
            "The media tool returned invalid metadata",
        )
        .operation("waveform_analyze")
    })?;
    parse_probe_audio_metadata(&json).ok_or_else(|| {
        AppError::new("no_audio_stream", "No audio stream was found in this media")
            .operation("waveform_analyze")
    })
}

async fn decode_f32(
    app: &AppHandle,
    file: &Path,
    sample_rate: u32,
    expected_samples: usize,
    cancelled: &AtomicBool,
    window: &WebviewWindow,
    media_id: &str,
) -> Result<ComputedLevel, AppError> {
    let mut child = Command::new(executable(app, "ffmpeg")?)
        .arg("-v")
        .arg("error")
        .arg("-i")
        .arg(file)
        .args(["-f", "f32le", "-acodec", "pcm_f32le", "-ar"])
        .arg(sample_rate.to_string())
        .args(["-ac", "1", "-"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|error| AppError::io("ffmpeg", error))?;
    let stdout = child.stdout.take().ok_or_else(|| {
        AppError::new("ffmpeg_failed", "The media decoder did not produce audio")
            .operation("waveform_analyze")
    })?;
    let stderr = child.stderr.take();
    let stderr_task = tokio::spawn(async move {
        let mut data = Vec::new();
        if let Some(stderr) = stderr {
            let _ = BufReader::new(stderr)
                .take(64 * 1024)
                .read_to_end(&mut data)
                .await;
        }
        data
    });
    let mut reader = BufReader::new(stdout);
    let mut pending = Vec::new();
    let mut samples = FinestLevelAccumulator::new(WAVEFORM_LEVEL_SAMPLES[0]);
    let mut sample_count = 0_usize;
    let mut chunk = [0_u8; 64 * 1024];
    let mut last_progress = 0.05_f64;
    loop {
        let read = tokio::select! {
            result = reader.read(&mut chunk) => result.map_err(|error| AppError::io("ffmpeg_output", error))?,
            _ = tokio::time::sleep(std::time::Duration::from_millis(50)) => {
                if cancelled.load(Ordering::Acquire) {
                    let _ = child.kill().await;
                    let _ = stderr_task.await;
                    return Err(AppError::new("waveform_cancelled", "Waveform analysis was cancelled").operation("waveform_analyze"));
                }
                continue;
            }
        };
        if read == 0 {
            break;
        }
        pending.extend_from_slice(&chunk[..read]);
        let complete = pending.len() / 4 * 4;
        for bytes in pending[..complete].chunks_exact(4) {
            let value =
                f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]).clamp(-1.0, 1.0);
            samples.push((value * i16::MAX as f32).round() as i16);
            sample_count += 1;
        }
        pending.drain(..complete);
        if expected_samples > 0 {
            let progress = (0.05 + 0.75 * (sample_count as f64 / expected_samples as f64).min(1.0))
                .max(last_progress);
            if progress - last_progress >= 0.01 {
                last_progress = progress;
                let _ = window.emit(
                    "waveform-progress",
                    WaveformProgress {
                        media_id: media_id.into(),
                        fraction: progress,
                    },
                );
            }
        }
    }
    let status = child
        .wait()
        .await
        .map_err(|error| AppError::io("ffmpeg_wait", error))?;
    let stderr = stderr_task.await.unwrap_or_default();
    if !status.success() {
        eprintln!("ffmpeg failed: {}", String::from_utf8_lossy(&stderr));
        return Err(
            AppError::new("ffmpeg_failed", "The media audio could not be decoded")
                .operation("waveform_analyze"),
        );
    }
    Ok(samples.finish())
}

#[tauri::command]
pub async fn waveform_analyze(
    file_path: String,
    media_id: String,
    app: AppHandle,
    window: WebviewWindow,
    state: State<'_, AppState>,
) -> Result<WaveformMeta, AppError> {
    crate::media::waveform::validate_media_id(&media_id)?;
    let roots = state
        .approved_paths
        .read()
        .iter()
        .cloned()
        .collect::<Vec<_>>();
    let file = canonicalize_approved_path(Path::new(&file_path), &roots)?;
    let cache_root = cache_root(&state);
    let cancelled = Arc::new(AtomicBool::new(false));
    if let Some(previous) = state.waveform_jobs.lock().insert(
        media_id.clone(),
        WaveformJobState {
            owner_window: window.label().to_owned(),
            cancelled: Arc::clone(&cancelled),
        },
    ) {
        previous.cancelled.store(true, Ordering::Release);
    }
    let _ = window.emit(
        "waveform-progress",
        WaveformProgress {
            media_id: media_id.clone(),
            fraction: 0.02,
        },
    );
    let result = async {
        let probe = probe(&app, &file).await?;
        let _ = window.emit(
            "waveform-progress",
            WaveformProgress {
                media_id: media_id.clone(),
                fraction: 0.05,
            },
        );
        let expected = (probe.duration * f64::from(probe.sample_rate)).max(0.0) as usize;
        let finest = decode_f32(
            &app,
            &file,
            probe.sample_rate,
            expected,
            &cancelled,
            &window,
            &media_id,
        )
        .await?;
        if cancelled.load(Ordering::Acquire) {
            return Err(
                AppError::new("waveform_cancelled", "Waveform analysis was cancelled")
                    .operation("waveform_analyze"),
            );
        }
        let _ = window.emit(
            "waveform-progress",
            WaveformProgress {
                media_id: media_id.clone(),
                fraction: 0.85,
            },
        );
        let levels = levels_from_finest(finest, &WAVEFORM_LEVEL_SAMPLES);
        let meta = write_cache(
            &cache_root,
            &media_id,
            probe.duration,
            probe.sample_rate,
            &levels,
        )?;
        let _ = window.emit(
            "waveform-progress",
            WaveformProgress {
                media_id: media_id.clone(),
                fraction: 1.0,
            },
        );
        Ok(meta)
    }
    .await;
    state.waveform_jobs.lock().remove(&media_id);
    if result.is_err() {
        let _ = delete_cache(&cache_root, &media_id);
    }
    result
}

#[tauri::command]
pub fn waveform_get_meta(
    media_id: String,
    state: State<'_, AppState>,
) -> Result<Option<WaveformMeta>, AppError> {
    read_meta(&cache_root(&state), &media_id)
}

#[tauri::command]
pub fn waveform_get_level(
    media_id: String,
    level: u32,
    state: State<'_, AppState>,
) -> Result<Option<WaveformLevelData>, AppError> {
    read_level(&cache_root(&state), &media_id, level)
}

#[tauri::command]
pub fn waveform_delete(media_id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    state.cancel_waveform_job(&media_id);
    delete_cache(&cache_root(&state), &media_id)
}
