use crate::error::AppError;
use crate::state::AppState;
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YouTubeTranscriptSegment {
    text: String,
    start_time: f64,
    end_time: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YouTubeMedia {
    audio_path: String,
    transcript: Vec<YouTubeTranscriptSegment>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct YouTubePreparationProgress<'a> {
    video_id: &'a str,
    stage: &'a str,
    fraction: f64,
}

fn emit_progress(app: &AppHandle, video_id: &str, stage: &str, fraction: f64) {
    let _ = app.emit(
        "youtube-preparation-progress",
        YouTubePreparationProgress {
            video_id,
            stage,
            fraction: fraction.clamp(0.0, 1.0),
        },
    );
}

fn validate_video_id(video_id: &str) -> Result<(), AppError> {
    if video_id.len() == 11
        && video_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    {
        Ok(())
    } else {
        Err(
            AppError::new("invalid_youtube_id", "The YouTube video ID is invalid")
                .operation("youtube_prepare"),
        )
    }
}

fn executable(app: &AppHandle, name: &str) -> Result<PathBuf, AppError> {
    let env_name = format!("PAWCAST_{}", name.replace('-', "_").to_ascii_uppercase());
    if let Some(path) = std::env::var_os(env_name) {
        return Ok(PathBuf::from(path));
    }
    if cfg!(debug_assertions) {
        if let Some(directory) = std::env::current_exe().ok().and_then(|path| {
            path.parent()?
                .parent()?
                .parent()
                .map(|root| root.join("binaries"))
        }) {
            if let Ok(entries) = std::fs::read_dir(directory) {
                if let Some(path) = entries.flatten().map(|entry| entry.path()).find(|path| {
                    path.file_name()
                        .and_then(|value| value.to_str())
                        .is_some_and(|file| file.starts_with(&format!("{name}-")))
                }) {
                    return Ok(path);
                }
            }
        }
        return Ok(PathBuf::from(name));
    }
    let executable_name = format!("{name}{}", std::env::consts::EXE_SUFFIX);
    let resources = app
        .path()
        .resource_dir()
        .map_err(|error| AppError::io("sidecar_path", error))?;
    [
        std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(|p| p.join(&executable_name))),
        Some(resources.join(&executable_name)),
    ]
    .into_iter()
    .flatten()
    .find(|path| path.is_file())
    .or_else(|| {
        std::fs::read_dir(resources)
            .ok()?
            .flatten()
            .map(|entry| entry.path())
            .find(|path| {
                path.file_name()
                    .and_then(|value| value.to_str())
                    .is_some_and(|file| file.starts_with(&format!("{name}-")))
            })
    })
    .ok_or_else(|| {
        AppError::new(
            "sidecar_missing",
            format!("Required {name} media tool is unavailable"),
        )
        .operation("youtube_prepare")
    })
}

fn parse_json3(path: &Path) -> Vec<YouTubeTranscriptSegment> {
    let Ok(bytes) = std::fs::read(path) else {
        return Vec::new();
    };
    let Ok(root) = serde_json::from_slice::<Value>(&bytes) else {
        return Vec::new();
    };
    root.get("events")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|event| {
            let start_ms = event.get("tStartMs")?.as_f64()?;
            let duration_ms = event
                .get("dDurationMs")
                .and_then(Value::as_f64)
                .unwrap_or(0.0);
            let text = event
                .get("segs")?
                .as_array()?
                .iter()
                .filter_map(|segment| segment.get("utf8").and_then(Value::as_str))
                .collect::<String>()
                .replace('\n', " ")
                .trim()
                .to_string();
            (!text.is_empty()).then_some(YouTubeTranscriptSegment {
                text,
                start_time: start_ms / 1000.0,
                end_time: (start_ms + duration_ms) / 1000.0,
            })
        })
        .collect()
}

fn caption_language(path: &Path, video_id: &str) -> Option<String> {
    let name = path.file_name()?.to_str()?;
    name.strip_prefix(&format!("{video_id}."))?
        .strip_suffix(".json3")
        .map(str::to_owned)
}

fn caption_priority(path: &Path, video_id: &str, language: &str) -> u8 {
    let Some(candidate) = caption_language(path, video_id) else {
        return u8::MAX;
    };
    if candidate == language {
        0
    } else if candidate.starts_with(&format!("{language}-")) {
        1
    } else if candidate == "en" {
        2
    } else if candidate.starts_with("en-") {
        3
    } else {
        4
    }
}

fn cached_audio_path(directory: &Path) -> Option<PathBuf> {
    std::fs::read_dir(directory)
        .ok()?
        .flatten()
        .map(|entry| entry.path())
        .find(|path| {
            let name = path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or_default();
            path.is_file()
                && !name.ends_with(".json3")
                && !name.ends_with(".part")
                && !name.ends_with(".ytdl")
        })
}

#[tauri::command]
pub async fn youtube_prepare(
    video_id: String,
    language: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<YouTubeMedia, AppError> {
    validate_video_id(&video_id)?;
    let language = language
        .filter(|value| {
            value.len() <= 16
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
        })
        .unwrap_or_else(|| "en".to_string());
    let directory = state
        .active_data_directory
        .read()
        .join("cache")
        .join("youtube")
        .join(&video_id);
    tokio::fs::create_dir_all(&directory)
        .await
        .map_err(|error| AppError::io("youtube_cache_create", error))?;
    emit_progress(&app, &video_id, "checking", 0.02);
    let output_template = directory.join(format!("{video_id}.%(ext)s"));
    let url = format!("https://www.youtube.com/watch?v={video_id}");
    let yt_dlp = executable(&app, "yt-dlp")?;
    let ffmpeg = executable(&app, "ffmpeg")?;
    let mut audio_path = cached_audio_path(&directory);
    if audio_path.is_none() {
        emit_progress(&app, &video_id, "downloading", 0.03);
        let mut child = Command::new(yt_dlp)
            .args([
                "--no-playlist",
                "--newline",
                "--no-colors",
                "--no-warnings",
                "--restrict-filenames",
                "--concurrent-fragments",
                "4",
                "--progress-template",
                "download:%(progress._percent_str)s",
                "-f",
                "bestaudio[abr<=128]/bestaudio/best",
            ])
            .arg("--ffmpeg-location")
            .arg(ffmpeg)
            .arg("-o")
            .arg(&output_template)
            .arg(&url)
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| AppError::io("youtube_download", error))?;
        if let Some(stdout) = child.stdout.take() {
            let mut lines = BufReader::new(stdout).lines();
            while let Some(line) = lines
                .next_line()
                .await
                .map_err(|error| AppError::io("youtube_download_output", error))?
            {
                if let Some(percent) = line
                    .strip_prefix("download:")
                    .map(str::trim)
                    .and_then(|value| value.trim_end_matches('%').trim().parse::<f64>().ok())
                {
                    emit_progress(&app, &video_id, "downloading", percent / 100.0);
                }
            }
        }
        let status = child
            .wait()
            .await
            .map_err(|error| AppError::io("youtube_download_wait", error))?;
        if !status.success() {
            return Err(AppError::new("youtube_download_failed", "YouTube audio could not be loaded. The video may be private, restricted, live, or unavailable.").operation("youtube_prepare"));
        }
        audio_path = cached_audio_path(&directory);
    }
    // Captions are an optimization, not a prerequisite for audio. YouTube can
    // rate-limit an individual caption track even when media playback works.
    emit_progress(&app, &video_id, "captions", 0.05);
    let _ = Command::new(executable(&app, "yt-dlp")?)
        .args([
            "--no-playlist",
            "--no-progress",
            "--no-warnings",
            "--skip-download",
            "--write-subs",
            "--write-auto-subs",
            "--sub-format",
            "json3",
            "--sub-langs",
        ])
        .arg(format!("{language},en"))
        .arg("-o")
        .arg(&output_template)
        .arg(&url)
        .output()
        .await;
    let mut caption_paths = Vec::new();
    for entry in std::fs::read_dir(&directory)
        .map_err(|error| AppError::io("youtube_cache_read", error))?
        .flatten()
    {
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        if name.ends_with(".json3") {
            caption_paths.push(path);
            continue;
        }
    }
    caption_paths.sort_by_key(|path| caption_priority(path, &video_id, &language));
    let transcript = caption_paths
        .iter()
        .map(|path| parse_json3(path))
        .find(|segments| !segments.is_empty())
        .unwrap_or_default();
    let audio_path = audio_path.ok_or_else(|| {
        AppError::new(
            "youtube_audio_missing",
            "YouTube returned no playable audio stream",
        )
        .operation("youtube_prepare")
    })?;
    state
        .approve_path(&audio_path)
        .map_err(|error| AppError::io("youtube_cache_approve", error))?;
    emit_progress(&app, &video_id, "ready", 1.0);
    Ok(YouTubeMedia {
        audio_path: audio_path.to_string_lossy().into_owned(),
        transcript,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_accepts_canonical_video_ids() {
        assert!(validate_video_id("dQw4w9WgXcQ").is_ok());
        assert!(validate_video_id("../../etc/passwd").is_err());
        assert!(validate_video_id("short").is_err());
    }

    #[test]
    fn prefers_requested_caption_language_then_english() {
        let requested = Path::new("dQw4w9WgXcQ.ja.json3");
        let requested_variant = Path::new("dQw4w9WgXcQ.ja-JP.json3");
        let english = Path::new("dQw4w9WgXcQ.en.json3");
        assert_eq!(caption_priority(requested, "dQw4w9WgXcQ", "ja"), 0);
        assert_eq!(caption_priority(requested_variant, "dQw4w9WgXcQ", "ja"), 1);
        assert_eq!(caption_priority(english, "dQw4w9WgXcQ", "ja"), 2);
    }
}
