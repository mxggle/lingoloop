use crate::{
    error::AppError,
    persistence::{
        manifest::{checksum_file, load_manifest, now_millis, replace_file, save_manifest},
        paths::resolve_data_path,
    },
};
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub operation_id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub target_path: String,
    pub before_checksum: Option<String>,
    pub after_checksum: Option<String>,
    pub timestamp: i64,
    pub status: String,
}

impl JournalEntry {
    pub fn pending(
        kind: &str,
        target_path: &str,
        before: Option<String>,
        after: Option<String>,
    ) -> Self {
        Self {
            operation_id: Uuid::new_v4().to_string(),
            kind: kind.to_owned(),
            target_path: target_path.to_owned(),
            before_checksum: before,
            after_checksum: after,
            timestamp: now_millis(),
            status: "pending".to_owned(),
        }
    }
}

pub fn append_journal(data_dir: &Path, entry: &JournalEntry) -> Result<(), AppError> {
    let directory = data_dir.join("backups/journal");
    fs::create_dir_all(&directory)
        .map_err(|error| AppError::io("create_journal_directory", error))?;
    let path = directory.join(format!("{}.jsonl", Local::now().format("%Y-%m-%d")));
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| AppError::io("open_journal", error))?;
    serde_json::to_writer(&mut file, entry)?;
    file.write_all(b"\n")
        .map_err(|error| AppError::io("append_journal", error))?;
    file.sync_data()
        .map_err(|error| AppError::io("sync_journal", error))
}

#[derive(Debug)]
struct JournalRecord {
    file_path: PathBuf,
    entry: JournalEntry,
}

fn journal_files(data_dir: &Path) -> Result<Vec<PathBuf>, AppError> {
    let directory = data_dir.join("backups/journal");
    if !directory.exists() {
        return Ok(Vec::new());
    }
    let mut files = fs::read_dir(directory)
        .map_err(|error| AppError::io("read_journal", error))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|extension| extension.to_str()) == Some("jsonl"))
        .collect::<Vec<_>>();
    files.sort();
    Ok(files)
}

fn read_journal_records(data_dir: &Path) -> Result<Vec<JournalRecord>, AppError> {
    let mut records = Vec::new();
    for file_path in journal_files(data_dir)? {
        let raw = fs::read_to_string(&file_path)
            .map_err(|error| AppError::io("read_journal_file", error))?;
        for (line_index, line) in raw.lines().enumerate() {
            if line.trim().is_empty() {
                continue;
            }
            let entry = serde_json::from_str(line).map_err(|error| {
                eprintln!("{}:{}: {error}", file_path.display(), line_index + 1);
                AppError::new(
                    "journal_corrupt",
                    "The Pawcast recovery journal is corrupted",
                )
                .operation("read_journal")
                .retryable(false)
            })?;
            records.push(JournalRecord {
                file_path: file_path.clone(),
                entry,
            });
        }
    }
    Ok(records)
}

pub fn read_journal(data_dir: &Path) -> Result<Vec<JournalEntry>, AppError> {
    Ok(read_journal_records(data_dir)?
        .into_iter()
        .map(|record| record.entry)
        .collect())
}

pub fn has_unresolved_pending(entries: &[JournalEntry]) -> bool {
    let mut latest_by_target = HashMap::<&str, &JournalEntry>::new();
    for entry in entries {
        latest_by_target.insert(&entry.target_path, entry);
    }
    latest_by_target
        .values()
        .any(|entry| entry.status == "pending")
}

pub fn recover_journal(data_dir: &Path) -> Result<Vec<String>, AppError> {
    let mut records = read_journal_records(data_dir)?;
    if records.is_empty() {
        return Ok(Vec::new());
    }

    let mut latest_by_operation = HashMap::<String, usize>::new();
    let mut latest_by_target = HashMap::<String, usize>::new();
    for (index, record) in records.iter().enumerate() {
        latest_by_operation.insert(record.entry.operation_id.clone(), index);
        latest_by_target.insert(record.entry.target_path.clone(), index);
    }
    let latest_operations = latest_by_operation
        .values()
        .copied()
        .collect::<HashSet<_>>();
    let latest_targets = latest_by_target.values().copied().collect::<HashSet<_>>();
    let mut manifest = load_manifest(data_dir)?;
    let mut recovered = Vec::new();

    for (index, record) in records.iter_mut().enumerate() {
        if !latest_operations.contains(&index) {
            continue;
        }
        let entry = &mut record.entry;
        let target = resolve_data_path(data_dir, &entry.target_path)?;
        let temporary = target.with_file_name(format!(
            "{}.tmp-{}",
            target.file_name().unwrap_or_default().to_string_lossy(),
            entry.operation_id
        ));

        if !latest_targets.contains(&index) {
            if entry.status == "pending" {
                let _ = fs::remove_file(&temporary);
                entry.status = "rolled_back".to_owned();
            }
            continue;
        }

        match entry.kind.as_str() {
            "write" => {
                let expected = entry.after_checksum.as_deref().ok_or_else(|| {
                    AppError::new("journal_corrupt", "A write journal entry has no checksum")
                        .operation("recover_journal")
                        .retryable(false)
                })?;
                let current_matches = checksum_file(&target)
                    .map(|checksum| checksum == expected)
                    .unwrap_or(false);
                let temporary_matches = checksum_file(&temporary)
                    .map(|checksum| checksum == expected)
                    .unwrap_or(false);

                if !current_matches && temporary_matches {
                    replace_file(&temporary, &target)
                        .map_err(|error| AppError::io("replay_journal", error))?;
                    recovered.push(entry.target_path.clone());
                } else {
                    let _ = fs::remove_file(&temporary);
                }

                if current_matches || temporary_matches {
                    manifest.update_file(&entry.target_path, expected.to_owned());
                    if entry.status == "pending" {
                        entry.status = "committed".to_owned();
                    }
                } else if entry.status == "pending" {
                    entry.status = "rolled_back".to_owned();
                }
            }
            "delete" => {
                let _ = fs::remove_file(&temporary);
                if target.exists() {
                    if entry.status == "pending" {
                        entry.status = "rolled_back".to_owned();
                    }
                } else {
                    manifest.files.retain(|file| file.path != entry.target_path);
                    if entry.status == "pending" {
                        entry.status = "committed".to_owned();
                        recovered.push(entry.target_path.clone());
                    }
                }
            }
            _ => {
                return Err(AppError::new(
                    "journal_corrupt",
                    "The Pawcast recovery journal contains an unknown operation",
                )
                .operation("recover_journal")
                .retryable(false));
            }
        }
    }

    save_manifest(data_dir, &mut manifest)?;
    for file_path in journal_files(data_dir)? {
        let lines = records
            .iter()
            .filter(|record| record.file_path == file_path)
            .map(|record| serde_json::to_string(&record.entry))
            .collect::<Result<Vec<_>, _>>()?;
        let bytes = if lines.is_empty() {
            Vec::new()
        } else {
            format!("{}\n", lines.join("\n")).into_bytes()
        };
        crate::persistence::manifest::atomic_write(&file_path, &bytes)?;
    }
    Ok(recovered)
}
