use pawcast_lib::commands::config::migrate_legacy_config;
use serde_json::{json, Value};
use std::fs;

#[test]
fn legacy_config_imports_missing_keys_without_overwriting_tauri_values() {
    let temp = tempfile::tempdir().unwrap();
    let config_dir = temp.path().join("tauri");
    let first_legacy = temp.path().join("legacy-one");
    let second_legacy = temp.path().join("legacy-two");
    fs::create_dir_all(&config_dir).unwrap();
    fs::create_dir_all(&first_legacy).unwrap();
    fs::create_dir_all(&second_legacy).unwrap();
    fs::write(
        config_dir.join("app-config.json"),
        serde_json::to_vec(&json!({"theme-storage":"tauri-new"})).unwrap(),
    )
    .unwrap();
    fs::write(
        first_legacy.join("app-config.json"),
        serde_json::to_vec(&json!({
            "theme-storage":"electron-old",
            "abloop-player-storage":"player-one"
        }))
        .unwrap(),
    )
    .unwrap();
    fs::write(
        second_legacy.join("app-config.json"),
        serde_json::to_vec(&json!({"layout-storage":"layout-two"})).unwrap(),
    )
    .unwrap();

    let source_before = fs::read(first_legacy.join("app-config.json")).unwrap();
    let count = migrate_legacy_config(&config_dir, &[first_legacy.clone(), second_legacy]).unwrap();

    assert_eq!(count, 2);
    let config: Value =
        serde_json::from_slice(&fs::read(config_dir.join("app-config.json")).unwrap()).unwrap();
    assert_eq!(config["theme-storage"], "tauri-new");
    assert_eq!(config["abloop-player-storage"], "player-one");
    assert_eq!(config["layout-storage"], "layout-two");
    assert_eq!(
        fs::read(first_legacy.join("app-config.json")).unwrap(),
        source_before
    );

    assert_eq!(
        migrate_legacy_config(&config_dir, &[first_legacy]).unwrap(),
        0,
        "rerunning migration must be idempotent"
    );
}
