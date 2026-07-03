use crate::error::AppError;
use crate::state::{AppState, WatcherHandle};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::cmp::Ordering;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

pub const MEDIA_EXTENSIONS: &[&str] = &[
    "mp3", "mp4", "wav", "flac", "ogg", "m4a", "aac", "webm", "mkv", "avi", "mov", "m4v", "opus",
    "wma",
];

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MediaFile {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FolderTreeNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FolderTreeNode>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MediaTreeChanged {
    folder_path: String,
    changed_path: Option<String>,
}

struct DebouncedWatcher {
    _watcher: RecommendedWatcher,
    _changes: mpsc::Sender<PathBuf>,
}

fn path_error(code: &str, message: &str, operation: &'static str) -> AppError {
    AppError::new(code, message).operation(operation)
}

pub fn canonicalize_approved_path(
    path: &Path,
    approved_roots: &[PathBuf],
) -> Result<PathBuf, AppError> {
    let canonical = path
        .canonicalize()
        .map_err(|error| AppError::io("canonicalize_media_path", error))?;
    if approved_roots
        .iter()
        .any(|root| canonical == *root || canonical.starts_with(root))
    {
        Ok(canonical)
    } else {
        Err(path_error(
            "path_not_approved",
            "Path is outside approved media locations",
            "validate_media_path",
        ))
    }
}

fn is_media_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            MEDIA_EXTENSIONS
                .iter()
                .any(|allowed| extension.eq_ignore_ascii_case(allowed))
        })
}

fn natural_cmp(left: &str, right: &str) -> Ordering {
    let left = left.to_lowercase();
    let right = right.to_lowercase();
    let mut a = left.chars().peekable();
    let mut b = right.chars().peekable();
    loop {
        match (a.peek(), b.peek()) {
            (None, None) => return Ordering::Equal,
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(ac), Some(bc)) if ac.is_ascii_digit() && bc.is_ascii_digit() => {
                let an: String = std::iter::from_fn(|| a.next_if(|c| c.is_ascii_digit())).collect();
                let bn: String = std::iter::from_fn(|| b.next_if(|c| c.is_ascii_digit())).collect();
                let ordering = an
                    .trim_start_matches('0')
                    .len()
                    .cmp(&bn.trim_start_matches('0').len())
                    .then_with(|| an.trim_start_matches('0').cmp(bn.trim_start_matches('0')))
                    .then_with(|| an.len().cmp(&bn.len()));
                if ordering != Ordering::Equal {
                    return ordering;
                }
            }
            _ => {
                let ordering = a.next().cmp(&b.next());
                if ordering != Ordering::Equal {
                    return ordering;
                }
            }
        }
    }
}

pub fn list_media_files_from_roots(
    folder: &Path,
    approved_roots: &[PathBuf],
) -> Result<Vec<MediaFile>, AppError> {
    let folder = canonicalize_approved_path(folder, approved_roots)?;
    let mut files = Vec::new();
    for entry in fs::read_dir(&folder).map_err(|error| AppError::io("list_media_files", error))? {
        let entry = entry.map_err(|error| AppError::io("list_media_files", error))?;
        let file_type = entry
            .file_type()
            .map_err(|error| AppError::io("list_media_files", error))?;
        if file_type.is_file() && is_media_file(&entry.path()) {
            files.push(MediaFile {
                name: entry.file_name().to_string_lossy().into_owned(),
                path: entry.path().to_string_lossy().into_owned(),
            });
        }
    }
    files.sort_by(|left, right| natural_cmp(&left.name, &right.name));
    Ok(files)
}

fn build_tree(
    dir: &Path,
    root: &Path,
    depth: usize,
    visited: &mut HashSet<PathBuf>,
) -> Result<Vec<FolderTreeNode>, AppError> {
    if depth == 0 {
        return Ok(Vec::new());
    }
    let canonical = dir
        .canonicalize()
        .map_err(|error| AppError::io("list_media_tree", error))?;
    if !canonical.starts_with(root) || !visited.insert(canonical) {
        return Ok(Vec::new());
    }
    let mut nodes = Vec::new();
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(nodes),
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if file_type.is_symlink() {
            continue;
        }
        if file_type.is_dir() {
            let children = build_tree(&path, root, depth - 1, visited)?;
            if !children.is_empty() {
                nodes.push(FolderTreeNode {
                    name,
                    path: path.to_string_lossy().into_owned(),
                    node_type: "directory".into(),
                    children: Some(children),
                });
            }
        } else if file_type.is_file() && is_media_file(&path) {
            nodes.push(FolderTreeNode {
                name,
                path: path.to_string_lossy().into_owned(),
                node_type: "file".into(),
                children: None,
            });
        }
    }
    nodes.sort_by(|left, right| {
        let left_directory = left.node_type == "directory";
        let right_directory = right.node_type == "directory";
        right_directory
            .cmp(&left_directory)
            .then_with(|| natural_cmp(&left.name, &right.name))
    });
    Ok(nodes)
}

pub fn list_media_tree_from_roots(
    folder: &Path,
    approved_roots: &[PathBuf],
) -> Result<Vec<FolderTreeNode>, AppError> {
    let root = canonicalize_approved_path(folder, approved_roots)?;
    build_tree(&root, &root, 10, &mut HashSet::new())
}

fn approved_roots(state: &AppState) -> Vec<PathBuf> {
    state.approved_paths.read().iter().cloned().collect()
}

#[tauri::command]
pub fn approve_path(file_path: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let path = PathBuf::from(file_path);
    let canonical = state
        .approve_path(&path)
        .map_err(|error| AppError::io("approve_path", error))?;
    if canonical.is_file() {
        if let Some(parent) = canonical.parent() {
            state.approved_paths.write().insert(parent.to_path_buf());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_media_files(
    folder_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<MediaFile>, AppError> {
    list_media_files_from_roots(Path::new(&folder_path), &approved_roots(&state))
}

#[tauri::command]
pub fn list_media_tree(
    folder_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<FolderTreeNode>, AppError> {
    list_media_tree_from_roots(Path::new(&folder_path), &approved_roots(&state))
}

#[tauri::command]
pub fn watch_media_tree(
    folder_path: String,
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let canonical = canonicalize_approved_path(Path::new(&folder_path), &approved_roots(&state))?;
    let owner = window.label().to_owned();
    let watch_id = Uuid::new_v4().to_string();
    let event_root = canonical.clone();
    let event_folder = folder_path.clone();
    let event_owner = owner.clone();
    let emit_app = app.clone();
    let (changes, receiver) = mpsc::channel::<PathBuf>();
    let notify_changes = changes.clone();
    let mut watcher = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        let Ok(event) = result else { return };
        let changed = event.paths.into_iter().find(|path| {
            path.canonicalize()
                .map(|value| value.starts_with(&event_root))
                .unwrap_or_else(|_| path.starts_with(&event_root))
        });
        let Some(changed) = changed else { return };
        let _ = notify_changes.send(changed);
    })
    .map_err(|error| AppError::io("watch_media_tree", error))?;
    watcher
        .watch(&canonical, RecursiveMode::Recursive)
        .map_err(|error| AppError::io("watch_media_tree", error))?;
    std::thread::spawn(move || {
        while let Ok(mut changed) = receiver.recv() {
            loop {
                match receiver.recv_timeout(Duration::from_millis(250)) {
                    Ok(next) => changed = next,
                    Err(mpsc::RecvTimeoutError::Timeout) => break,
                    Err(mpsc::RecvTimeoutError::Disconnected) => return,
                }
            }
            if let Some(target) = emit_app.get_webview_window(&event_owner) {
                let _ = target.emit(
                    "media-tree-changed",
                    MediaTreeChanged {
                        folder_path: event_folder.clone(),
                        changed_path: Some(changed.to_string_lossy().into_owned()),
                    },
                );
            }
        }
    });

    let replaced = state
        .watcher_handles
        .lock()
        .iter()
        .find_map(|(id, handle)| {
            (handle.owner_window == owner && handle.canonical_root == canonical).then(|| id.clone())
        });
    if let Some(id) = replaced {
        state.watcher_handles.lock().remove(&id);
    }
    state.watcher_handles.lock().insert(
        watch_id.clone(),
        WatcherHandle {
            owner_window: owner,
            canonical_root: canonical,
            handle: Box::new(DebouncedWatcher {
                _watcher: watcher,
                _changes: changes,
            }),
        },
    );
    Ok(watch_id)
}

#[tauri::command]
pub fn unwatch_media_tree(watch_id: String, window: WebviewWindow, state: State<'_, AppState>) {
    let mut handles = state.watcher_handles.lock();
    if handles
        .get(&watch_id)
        .is_some_and(|entry| entry.owner_window == window.label())
    {
        handles.remove(&watch_id);
    }
}

pub fn remove_window_watchers(state: &AppState, owner_window: &str) {
    state
        .watcher_handles
        .lock()
        .retain(|_, entry| entry.owner_window != owner_window);
}

#[tauri::command]
pub fn show_in_file_manager(
    target_path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, AppError> {
    let canonical = canonicalize_approved_path(Path::new(&target_path), &approved_roots(&state))?;
    let opener = app.opener();
    if canonical.is_dir() {
        opener
            .open_path(canonical.to_string_lossy().into_owned(), None::<&str>)
            .map_err(|error| AppError::io("show_in_file_manager", error))?;
    } else {
        opener
            .reveal_item_in_dir(&canonical)
            .map_err(|error| AppError::io("show_in_file_manager", error))?;
    }
    Ok(true)
}
