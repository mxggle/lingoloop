use pawcast_lib::commands::filesystem::{
    canonicalize_approved_path, list_media_files_from_roots, list_media_tree_from_roots,
    remove_window_watchers,
};
use pawcast_lib::state::{AppState, WatcherHandle};
use std::fs;

#[test]
fn approved_paths_block_parent_and_symlink_escapes() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("root");
    let outside = temp.path().join("outside");
    fs::create_dir_all(&root).unwrap();
    fs::create_dir_all(&outside).unwrap();
    fs::write(root.join("song.mp3"), b"audio").unwrap();
    fs::write(outside.join("secret.mp3"), b"secret").unwrap();

    let approved = vec![root.canonicalize().unwrap()];
    assert!(canonicalize_approved_path(&root.join("song.mp3"), &approved).is_ok());
    assert!(canonicalize_approved_path(&root.join("../outside/secret.mp3"), &approved).is_err());

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(&outside, root.join("escape")).unwrap();
        assert!(canonicalize_approved_path(&root.join("escape/secret.mp3"), &approved).is_err());
    }
}

#[test]
fn lists_supported_media_and_naturally_sorts_directories_first() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path();
    fs::create_dir(root.join("Season 10")).unwrap();
    fs::create_dir(root.join("Season 2")).unwrap();
    fs::write(root.join("track10.mp3"), b"").unwrap();
    fs::write(root.join("track2.M4A"), b"").unwrap();
    fs::write(root.join("notes.txt"), b"").unwrap();
    fs::write(root.join("Season 2/episode.opus"), b"").unwrap();
    fs::write(root.join("Season 10/episode.webm"), b"").unwrap();

    let approved = vec![root.canonicalize().unwrap()];
    let files = list_media_files_from_roots(root, &approved).unwrap();
    assert_eq!(
        files.iter().map(|f| f.name.as_str()).collect::<Vec<_>>(),
        ["track2.M4A", "track10.mp3"]
    );

    let tree = list_media_tree_from_roots(root, &approved).unwrap();
    assert_eq!(
        tree.iter().map(|n| n.name.as_str()).collect::<Vec<_>>(),
        ["Season 2", "Season 10", "track2.M4A", "track10.mp3"]
    );
    assert!(tree[0]
        .children
        .as_ref()
        .is_some_and(|children| children.len() == 1));
}

#[test]
fn tree_skips_hidden_unsupported_and_empty_directories() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path();
    fs::create_dir(root.join("empty")).unwrap();
    fs::create_dir_all(root.join("nested/deeper")).unwrap();
    fs::create_dir_all(root.join(".hidden")).unwrap();
    fs::write(root.join("nested/deeper/movie.mkv"), b"").unwrap();
    fs::write(root.join("nested/readme.md"), b"").unwrap();
    fs::write(root.join(".hidden/song.mp3"), b"").unwrap();

    let tree = list_media_tree_from_roots(root, &[root.canonicalize().unwrap()]).unwrap();
    assert_eq!(tree.len(), 1);
    assert_eq!(tree[0].name, "nested");
    assert_eq!(tree[0].children.as_ref().unwrap()[0].name, "deeper");
}

#[test]
fn watcher_cleanup_is_scoped_to_owner_window() {
    let temp = tempfile::tempdir().unwrap();
    let state = AppState::new(temp.path().join("config"), temp.path().join("data"));
    let root = temp.path().to_path_buf();
    state.watcher_handles.lock().insert(
        "one".into(),
        WatcherHandle {
            owner_window: "main".into(),
            canonical_root: root.clone(),
            handle: Box::new(()),
        },
    );
    state.watcher_handles.lock().insert(
        "two".into(),
        WatcherHandle {
            owner_window: "settings".into(),
            canonical_root: root,
            handle: Box::new(()),
        },
    );
    remove_window_watchers(&state, "settings");
    assert!(state.watcher_handles.lock().contains_key("one"));
    assert!(!state.watcher_handles.lock().contains_key("two"));
}
