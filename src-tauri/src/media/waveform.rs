use crate::error::AppError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub const WAVEFORM_LEVEL_SAMPLES: [u32; 9] =
    [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
const BYTES_PER_POINT: usize = 6;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ProbeAudioMetadata {
    pub duration: f64,
    pub sample_rate: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ComputedLevel {
    pub samples_per_peak: u32,
    pub min: Vec<i16>,
    pub max: Vec<i16>,
    pub rms: Vec<u16>,
}

pub struct FinestLevelAccumulator {
    samples_per_peak: u32,
    current: Vec<i16>,
    level: ComputedLevel,
}

impl FinestLevelAccumulator {
    pub fn new(samples_per_peak: u32) -> Self {
        Self {
            samples_per_peak,
            current: Vec::with_capacity(samples_per_peak as usize),
            level: ComputedLevel {
                samples_per_peak,
                min: Vec::new(),
                max: Vec::new(),
                rms: Vec::new(),
            },
        }
    }

    pub fn push(&mut self, sample: i16) {
        self.current.push(sample);
        if self.current.len() == self.samples_per_peak as usize {
            self.flush();
        }
    }

    fn flush(&mut self) {
        let (min, max, rms) = stats(&self.current);
        self.level.min.push(min);
        self.level.max.push(max);
        self.level.rms.push(rms);
        self.current.clear();
    }

    pub fn finish(mut self) -> ComputedLevel {
        // Preserve the legacy cache format: discard a trailing partial window unless
        // the complete media is shorter than a single window.
        if self.level.min.is_empty() {
            self.flush();
        }
        self.level
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WaveformLevelMeta {
    pub level: u32,
    pub samples_per_peak: u32,
    pub points: usize,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WaveformMeta {
    pub media_id: String,
    pub duration: f64,
    pub sample_rate: u32,
    pub levels: Vec<WaveformLevelMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WaveformLevelData {
    pub media_id: String,
    pub level: u32,
    pub samples_per_peak: u32,
    pub sample_rate: u32,
    pub min: Vec<i16>,
    pub max: Vec<i16>,
    pub rms: Vec<u16>,
}

pub fn validate_media_id(media_id: &str) -> Result<(), AppError> {
    let valid = !media_id.is_empty()
        && media_id.len() <= 128
        && media_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'));
    valid.then_some(()).ok_or_else(|| {
        AppError::new("invalid_media_id", "Waveform media ID is invalid").operation("waveform")
    })
}

pub fn parse_probe_audio_metadata(info: &Value) -> Option<ProbeAudioMetadata> {
    let stream = info
        .get("streams")?
        .as_array()?
        .iter()
        .find(|stream| stream.get("codec_type").and_then(Value::as_str) == Some("audio"))?;
    let format_duration = info
        .pointer("/format/duration")
        .and_then(Value::as_str)
        .and_then(|value| value.parse::<f64>().ok())
        .unwrap_or(0.0);
    let duration = stream
        .get("duration")
        .and_then(Value::as_str)
        .and_then(|value| value.parse::<f64>().ok())
        .filter(|value| *value > 0.0)
        .unwrap_or(format_duration);
    let sample_rate = stream
        .get("sample_rate")
        .and_then(Value::as_str)
        .and_then(|value| value.parse::<u32>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(44_100);
    Some(ProbeAudioMetadata {
        duration,
        sample_rate,
    })
}

fn stats(samples: &[i16]) -> (i16, i16, u16) {
    if samples.is_empty() {
        return (0, 0, 0);
    }
    let mut min = i16::MAX;
    let mut max = i16::MIN;
    let mut sum_sq = 0_f64;
    for &sample in samples {
        min = min.min(sample);
        max = max.max(sample);
        sum_sq += f64::from(sample) * f64::from(sample);
    }
    (
        min,
        max,
        (sum_sq / samples.len() as f64)
            .sqrt()
            .round()
            .clamp(0.0, u16::MAX as f64) as u16,
    )
}

pub fn analyze_samples(samples: &[i16], resolutions: &[u32]) -> Vec<ComputedLevel> {
    let Some(&finest_size) = resolutions.first() else {
        return Vec::new();
    };
    let mut accumulator = FinestLevelAccumulator::new(finest_size);
    for &sample in samples {
        accumulator.push(sample);
    }
    levels_from_finest(accumulator.finish(), resolutions)
}

pub fn levels_from_finest(finest: ComputedLevel, resolutions: &[u32]) -> Vec<ComputedLevel> {
    let finest_size = finest.samples_per_peak;
    let mut levels = vec![finest];
    for &size in &resolutions[1..] {
        let ratio = (size / finest_size).max(1) as usize;
        let points = (levels[0].min.len() / ratio).max(1);
        let mut level = ComputedLevel {
            samples_per_peak: size,
            min: Vec::with_capacity(points),
            max: Vec::with_capacity(points),
            rms: Vec::with_capacity(points),
        };
        for point in 0..points {
            let start = point * ratio;
            let end = levels[0].min.len().min(start + ratio);
            if start >= end {
                level.min.push(0);
                level.max.push(0);
                level.rms.push(0);
                continue;
            }
            level
                .min
                .push(*levels[0].min[start..end].iter().min().unwrap());
            level
                .max
                .push(*levels[0].max[start..end].iter().max().unwrap());
            let mean_square = levels[0].rms[start..end]
                .iter()
                .map(|value| f64::from(*value).powi(2))
                .sum::<f64>()
                / (end - start) as f64;
            level
                .rms
                .push(mean_square.sqrt().round().clamp(0.0, u16::MAX as f64) as u16);
        }
        levels.push(level);
    }
    levels
}

fn media_dir(cache_root: &Path, media_id: &str) -> Result<PathBuf, AppError> {
    validate_media_id(media_id)?;
    Ok(cache_root.join(media_id))
}
fn meta_path(cache_root: &Path, media_id: &str) -> Result<PathBuf, AppError> {
    Ok(media_dir(cache_root, media_id)?.join("meta.json"))
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    let parent = path.parent().ok_or_else(|| {
        AppError::new("invalid_cache_path", "Waveform cache path is invalid")
            .operation("waveform_cache")
    })?;
    fs::create_dir_all(parent).map_err(|error| AppError::io("waveform_cache_create", error))?;
    let temp = parent.join(format!(".tmp-{}", Uuid::new_v4()));
    let result = (|| {
        let mut file =
            fs::File::create(&temp).map_err(|error| AppError::io("waveform_cache_write", error))?;
        file.write_all(bytes)
            .map_err(|error| AppError::io("waveform_cache_write", error))?;
        file.sync_all()
            .map_err(|error| AppError::io("waveform_cache_sync", error))?;
        fs::rename(&temp, path).map_err(|error| AppError::io("waveform_cache_commit", error))
    })();
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}

pub fn write_cache(
    cache_root: &Path,
    media_id: &str,
    duration: f64,
    sample_rate: u32,
    levels: &[ComputedLevel],
) -> Result<WaveformMeta, AppError> {
    let dir = media_dir(cache_root, media_id)?;
    fs::create_dir_all(&dir).map_err(|error| AppError::io("waveform_cache_create", error))?;
    let mut metadata = Vec::with_capacity(levels.len());
    for level in levels {
        if level.min.len() != level.max.len() || level.min.len() != level.rms.len() {
            return Err(
                AppError::new("invalid_waveform", "Waveform level lengths do not match")
                    .operation("waveform_cache"),
            );
        }
        let path = dir.join(format!("level-{}.bin", level.samples_per_peak));
        let mut binary = Vec::with_capacity(level.min.len() * BYTES_PER_POINT);
        for index in 0..level.min.len() {
            binary.extend_from_slice(&level.min[index].to_le_bytes());
            binary.extend_from_slice(&level.max[index].to_le_bytes());
            binary.extend_from_slice(&level.rms[index].to_le_bytes());
        }
        atomic_write(&path, &binary)?;
        metadata.push(WaveformLevelMeta {
            level: level.samples_per_peak,
            samples_per_peak: level.samples_per_peak,
            points: level.min.len(),
            path: path.to_string_lossy().into_owned(),
        });
    }
    let meta = WaveformMeta {
        media_id: media_id.into(),
        duration,
        sample_rate,
        levels: metadata,
    };
    atomic_write(
        &meta_path(cache_root, media_id)?,
        &serde_json::to_vec_pretty(&meta)?,
    )?;
    Ok(meta)
}

pub fn read_meta(cache_root: &Path, media_id: &str) -> Result<Option<WaveformMeta>, AppError> {
    let path = meta_path(cache_root, media_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let valid = fs::read(&path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<WaveformMeta>(&bytes).ok())
        .filter(|meta| {
            meta.media_id == media_id
                && !meta.levels.is_empty()
                && meta.levels.iter().all(|level| {
                    level.points > 0
                        && Path::new(&level.path).parent() == path.parent()
                        && fs::metadata(&level.path).is_ok_and(|metadata| {
                            metadata.len() == (level.points * BYTES_PER_POINT) as u64
                        })
                })
        });
    if valid.is_none() {
        let _ = fs::remove_dir_all(media_dir(cache_root, media_id)?);
    }
    Ok(valid)
}

pub fn read_level(
    cache_root: &Path,
    media_id: &str,
    level: u32,
) -> Result<Option<WaveformLevelData>, AppError> {
    let Some(meta) = read_meta(cache_root, media_id)? else {
        return Ok(None);
    };
    let Some(level_meta) = meta
        .levels
        .iter()
        .find(|candidate| candidate.level == level)
    else {
        return Ok(None);
    };
    let bytes =
        fs::read(&level_meta.path).map_err(|error| AppError::io("waveform_cache_read", error))?;
    let mut min = Vec::with_capacity(level_meta.points);
    let mut max = Vec::with_capacity(level_meta.points);
    let mut rms = Vec::with_capacity(level_meta.points);
    for point in bytes.chunks_exact(BYTES_PER_POINT) {
        min.push(i16::from_le_bytes([point[0], point[1]]));
        max.push(i16::from_le_bytes([point[2], point[3]]));
        rms.push(u16::from_le_bytes([point[4], point[5]]));
    }
    Ok(Some(WaveformLevelData {
        media_id: media_id.into(),
        level,
        samples_per_peak: level_meta.samples_per_peak,
        sample_rate: meta.sample_rate,
        min,
        max,
        rms,
    }))
}

pub fn delete_cache(cache_root: &Path, media_id: &str) -> Result<(), AppError> {
    let dir = media_dir(cache_root, media_id)?;
    if dir.exists() {
        fs::remove_dir_all(dir).map_err(|error| AppError::io("waveform_cache_delete", error))?;
    }
    Ok(())
}
