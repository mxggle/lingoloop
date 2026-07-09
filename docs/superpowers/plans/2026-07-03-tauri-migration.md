# Pawcast Tauri Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Electron with a complete Tauri 2 desktop runtime while retaining the Vite web target and all Pawcast behavior.

**Architecture:** A typed `DesktopAPI` isolates React, stores, repositories, and services from runtime details. Tauri commands and plugins implement the native backend in focused Rust modules; the existing canonical `PawcastData` schema remains the persistence contract. Electron remains only as a temporary parity oracle until the final removal task.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Zustand 5, Tauri 2.11, Rust 1.92, Tokio, Serde, Notify, Reqwest, FFmpeg/FFprobe sidecars, Node test runner, Cargo tests.

## Global Constraints

- Tauri 2 is the only desktop runtime in the completed repository.
- Preserve the standalone Vite web build.
- Preserve current React UX, routes, store shapes, repository contracts, persistence schema version 1, and translations.
- Support macOS, Windows, and Linux.
- Automatically and non-destructively migrate the audited Electron `1.0.0-beta.3` data path.
- Use packaged FFmpeg and FFprobe sidecars in release builds.
- Shared layers must not import `@tauri-apps/*`, inspect Tauri globals, or call transport commands directly.
- Update `en.json`, `ja.json`, and `zh.json` together for every copy change.
- Do not leave placeholders, fake APIs, empty native commands, or compatibility behavior in the completed runtime.
- Preserve user changes and avoid unrelated refactors.

## Parallel Ownership

- **Frontend worker:** Tasks 2 and 7. Owns `src/platform/**`, `src/components/desktop/**`, frontend renames, frontend tests, and related imports. It must not edit `src-tauri/**` or `package.json`.
- **Persistence worker:** Tasks 1, 3, and 4. Owns `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/**`, `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, error/state/config/data/persistence/migration modules, and Cargo dependency integration.
- **Native-media worker:** Tasks 5 and 6. Owns only its listed files below. It must not edit Cargo manifests, `lib.rs`, `main.rs`, state/error modules, or frontend files; it sends required dependencies and registration names to the persistence worker.
- **Root integrator:** Tasks 8 and 9. Resolves interfaces, updates package scripts/dependencies, deletes Electron, runs full verification, and owns final documentation.

---

### Task 1: Bootstrap a Real Tauri Runtime and Error Contract

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/error.rs`
- Create: `src-tauri/src/state.rs`
- Test: inline Rust tests in `src-tauri/src/error.rs`

**Interfaces:**
- Produces `pub fn run()` as the desktop entry point.
- Produces `AppError { code: String, message: String, operation: Option<String>, retryable: bool }` serialized to camelCase JSON.
- Produces `AppState` containing approved paths, watcher handles, active data directory, per-key config mutation locks, and waveform job cancellation state.
- Registers module names `commands::{config,data,migration,filesystem,http,waveform,windows}` and `media::{protocol,waveform}` once those files exist.

- [ ] **Step 1: Write error serialization tests**

```rust
#[test]
fn serializes_safe_command_error() {
    let error = AppError::new("path_not_approved", "Path is not approved")
        .operation("list_media_tree")
        .retryable(false);
    let json = serde_json::to_value(error).unwrap();
    assert_eq!(json["code"], "path_not_approved");
    assert_eq!(json["operation"], "list_media_tree");
    assert_eq!(json["retryable"], false);
}
```

- [ ] **Step 2: Run the test and confirm the crate is absent**

Run: `cargo test --manifest-path src-tauri/Cargo.toml error::tests::serializes_safe_command_error`

Expected: failure because `src-tauri/Cargo.toml` does not exist.

- [ ] **Step 3: Create the Tauri crate and real entry point**

Use package `pawcast`, library `pawcast_lib`, edition 2021, `tauri = "2.11"`, and Tauri build 2.5 or newer. Add Serde, Serde JSON, Thiserror, Tokio, Parking Lot, UUID, SHA-2, Hex, Notify, Walkdir, Mime Guess, Reqwest with rustls/json/stream, URL, and the Tauri dialog/opener/shell plugins. `main.rs` calls `pawcast_lib::run()`; `run()` builds the plugin set, manages `AppState`, registers commands, configures the secure media protocol, and runs the generated context.

- [ ] **Step 4: Add explicit capability permissions**

`default.json` grants core window/event commands and only the dialog, opener, and shell operations used by the desktop adapter. Scope shell execution to packaged `ffmpeg` and `ffprobe`; do not grant arbitrary command execution or unrestricted filesystem access.

- [ ] **Step 5: Verify the Tauri core**

Run: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo test --manifest-path src-tauri/Cargo.toml error::tests::serializes_safe_command_error`

Expected: formatting and the error test pass.

- [ ] **Step 6: Commit**

```bash
git add src-tauri
git commit -m "feat: bootstrap Tauri desktop runtime"
```

### Task 2: Define and Test the TypeScript Desktop Boundary

**Files:**
- Create: `src/platform/desktop/types.ts`
- Create: `src/platform/desktop/errors.ts`
- Create: `src/platform/desktop/tauriDesktop.ts`
- Create: `src/platform/desktop/index.ts`
- Create: `src/platform/runtime.ts`
- Create: `tests/desktopApi.test.ts`
- Modify: `src/types/electron.d.ts` only to re-export transitional domain types until Task 7 moves them

**Interfaces:**
- Produces `DesktopAPI` with the same behavior as the current `ElectronAPI`, with methods named by behavior: `openFile`, `openFolder`, `openSettingsWindow`, `closeSettingsWindow`, `openGlossaryWindow`, `closeGlossaryWindow`, `navigateInMainWindow`, `onNavigate`, `showInFileManager`, `listMediaFiles`, `listMediaTree`, `watchMediaTree`, `configGet`, `configSet`, `configGetAll`, `onConfigChanged`, `fetch`, waveform methods, data methods, migration methods, and `approvePath`.
- Produces `desktopApi: DesktopAPI | null` and `isDesktop(): boolean`.
- Consumes Tauri command names in snake_case and maps payload fields explicitly.

- [ ] **Step 1: Write adapter mapping and unsubscribe tests**

```ts
test("tauri desktop maps config and cleans up listeners", async () => {
  const calls: unknown[] = [];
  const unlisten = mock.fn();
  const api = createTauriDesktop({
    invoke: async (command, payload) => { calls.push([command, payload]); return "value"; },
    listen: async () => unlisten,
  });
  assert.equal(await api.configGet("theme-storage"), "value");
  assert.deepEqual(calls[0], ["config_get", { key: "theme-storage" }]);
  const stop = api.onConfigChanged(() => undefined);
  await stop.ready;
  stop();
  assert.equal(unlisten.mock.callCount(), 1);
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `node --import tsx --test tests/desktopApi.test.ts`

Expected: module-not-found failure for `src/platform/desktop/tauriDesktop.ts`.

- [ ] **Step 3: Implement dependency-injected Tauri transport**

`createTauriDesktop` receives `invoke`, `listen`, dialog `open`, opener `revealItemInDir`, window factory/current-window access, and `convertFileSrc`. Production imports these functions only inside `src/platform/desktop/tauriDesktop.ts`. Every event subscription returns an immediate cleanup function that also cleans up if asynchronous `listen` resolves after unmount.

- [ ] **Step 4: Add structured error conversion**

`toDesktopError(value)` recognizes `{ code, message, operation, retryable }`, preserves stable codes, and maps unknown rejections to code `desktop_command_failed` without exposing object dumps to UI.

- [ ] **Step 5: Verify adapter isolation**

Run: `node --import tsx --test tests/desktopApi.test.ts && ! rg -n "@tauri-apps|__TAURI" src --glob '!platform/desktop/**' --glob '!platform/runtime.ts'`

Expected: adapter tests pass and the forbidden-import search returns no matches.

- [ ] **Step 6: Commit**

```bash
git add src/platform src/types/electron.d.ts tests/desktopApi.test.ts
git commit -m "feat: add typed Tauri desktop boundary"
```

### Task 3: Port Configuration and Canonical Data Persistence

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/config.rs`
- Create: `src-tauri/src/commands/data.rs`
- Create: `src-tauri/src/persistence/mod.rs`
- Create: `src-tauri/src/persistence/paths.rs`
- Create: `src-tauri/src/persistence/manifest.rs`
- Create: `src-tauri/src/persistence/journal.rs`
- Create: `src-tauri/src/persistence/store.rs`
- Create: `src-tauri/tests/persistence.rs`

**Interfaces:**
- Commands: `config_get`, `config_set`, `config_get_all`, `data_get`, `data_put`, `data_delete`, `data_list`, `data_get_media_file`, `data_put_media_file`, `data_get_directory`, `data_change_directory`, `data_is_migrated`.
- Events: `config-changed` with `{ key: string }`.
- Preserve schema types and directory layout defined in `src/types/persistence.ts` and behavior in `electron/dataStore.ts`, `manifestManager.ts`, and `journalManager.ts`.

- [ ] **Step 1: Write temporary-directory persistence tests**

```rust
#[test]
fn json_write_is_atomic_and_updates_manifest() {
    let temp = tempfile::tempdir().unwrap();
    let store = DataStore::open(temp.path().join("PawcastData"), "1.0.0-beta.3").unwrap();
    store.put_json("settings/app-settings.json", &json!({"version": 1})).unwrap();
    assert_eq!(store.get_json("settings/app-settings.json").unwrap(), Some(json!({"version": 1})));
    let manifest = store.manifest().unwrap();
    assert!(manifest.files.iter().any(|f| f.path == "settings/app-settings.json"));
    assert!(!temp.path().to_string_lossy().contains(".tmp-"));
}
```

Also test `../escape.json`, absolute paths, delete journaling, binary round trips, per-directory serialization, and directory-copy rollback.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test persistence`

Expected: compile failure because the persistence modules do not exist.

- [ ] **Step 3: Port atomic persistence behavior**

Use `Path::canonicalize` for existing parents plus lexical component rejection for new targets. Sync temporary files before rename. Store checksums as lowercase SHA-256 hex. Preserve manifest fields and journal entries exactly as defined by `src/types/persistence.ts`. Create all existing canonical subdirectories at initialization.

- [ ] **Step 4: Implement config persistence and events**

Store configuration as JSON in Tauri app config data, serialize mutations, write atomically, and emit `config-changed` to all webview windows after a successful write. A JSON null value deletes the key to match current Zustand storage behavior.

- [ ] **Step 5: Implement data-directory movement**

Copy into a unique staging directory, verify manifest checksums there, atomically update `.pawcast-datadir`, retain the original directory, and remove staging on failure. Reject a destination nested within the active directory.

- [ ] **Step 6: Verify**

Run: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check && cargo test --manifest-path src-tauri/Cargo.toml --test persistence`

Expected: all persistence tests pass.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/commands src-tauri/src/persistence src-tauri/tests/persistence.rs
git commit -m "feat: port Pawcast persistence to Rust"
```

### Task 4: Port Migration, Health Checks, and Recovery

**Files:**
- Create: `src-tauri/src/commands/migration.rs`
- Create: `src-tauri/src/persistence/migration.rs`
- Create: `src-tauri/src/persistence/health.rs`
- Create: `src-tauri/tests/migration.rs`
- Create: `src-tauri/tests/health.rs`
- Create: `src-tauri/tests/fixtures/electron-app-config.json`
- Create: `src-tauri/tests/fixtures/PawcastData/manifest.json`

**Interfaces:**
- Commands: `data_run_migration`, `data_health_check`, `data_recover`.
- Consumes the canonical `DataStore` from Task 3.
- Produces the current `MigrationResult`, `HealthCheckResult`, and `RecoveryResult` JSON shapes in camelCase.

- [ ] **Step 1: Write fixture-driven migration tests**

Tests create Electron user-data fixtures containing `.pawcast-datadir` and `app-config.json`, then assert source files are unchanged, canonical records are imported once, rerunning produces zero duplicates, canonical values win, and a failed stage can be retried.

- [ ] **Step 2: Run tests to verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test migration --test health`

Expected: compile failure for missing migration and health modules.

- [ ] **Step 3: Port supported Electron migration**

Search OS-specific Pawcast and `com.pawcast.app` application-data locations. Support the audited `1.0.0-beta.3` canonical directory and Electron Store JSON. Do not claim to parse arbitrary Chromium LevelDB/IndexedDB files. Merge by stable ID and record migration status only after every required stage succeeds.

- [ ] **Step 4: Port health and journal recovery**

Verify manifest readability, every recorded checksum, recording/media index references, and pending/committed journal state. `journal` recovery replays committed entries and rolls back safe pending temporary files. Unsupported recovery strategies return a typed non-retryable error.

- [ ] **Step 5: Verify and commit**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test migration --test health`

Expected: all fixture tests pass.

```bash
git add src-tauri/src/commands/migration.rs src-tauri/src/persistence src-tauri/tests
git commit -m "feat: migrate and validate Electron user data"
```

### Task 5: Port Windows, Filesystem, Watchers, and Local Media

**Files:**
- Create: `src-tauri/src/commands/windows.rs`
- Create: `src-tauri/src/commands/filesystem.rs`
- Create: `src-tauri/src/media/mod.rs`
- Create: `src-tauri/src/media/protocol.rs`
- Create: `src-tauri/tests/filesystem.rs`
- Create: `src-tauri/tests/media_protocol.rs`

**Interfaces:**
- Commands: `open_settings_window`, `close_settings_window`, `open_glossary_window`, `close_glossary_window`, `navigate_in_main_window`, `approve_path`, `list_media_files`, `list_media_tree`, `watch_media_tree`, `unwatch_media_tree`, `show_in_file_manager`.
- Event: `navigate` with `{ route, entryId? }`; `media-tree-changed` with `{ folderPath, changedPath }`.
- Protocol: `local-media://media/<encoded-native-path>` supporting `GET`, `HEAD`, and a single RFC 7233 byte range.

- [ ] **Step 1: Write containment, sorting, and range tests**

Tests cover case-aware canonical containment, `..`, symlink escape, supported media extensions, directory-first natural sorting, recursive trees, watcher cleanup, full responses, `bytes=10-19`, open-ended ranges, suffix ranges, `416`, MIME type, and unapproved paths.

- [ ] **Step 2: Run tests to verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test filesystem --test media_protocol`

Expected: compile failure because native filesystem/media modules are absent.

- [ ] **Step 3: Implement approved roots and trees**

Canonicalize explicitly selected paths, persist source roots through the config command, and approve persisted roots only after they still exist. Match the media extension list and folder tree shape in `electron/main.ts` and `src/types/electron.d.ts`. Never follow a symlink outside an approved root.

- [ ] **Step 4: Implement lifecycle-bound watchers**

Use `notify` with a 250 ms debounce. Store watcher ID, canonical folder, and owner window label. Stop watchers on explicit unwatch, replacement, and window destruction. Emit only after path validation.

- [ ] **Step 5: Implement auxiliary windows and navigation**

Use labels `main`, `settings`, and `glossary`. Reuse and focus existing windows. Route settings to `#/settings-window?tab=<tab>&section=<section>` and glossary to `#/glossary-window`. Send main navigation only to the `main` window.

- [ ] **Step 6: Implement seekable local media protocol**

Decode exactly once, validate against approved roots, stream rather than buffer the entire file, set `Accept-Ranges`, `Content-Range`, `Content-Length`, and MIME headers, and return `206` for valid ranges.

- [ ] **Step 7: Verify and report integration names**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test filesystem --test media_protocol`

Expected: all tests pass. Send the persistence worker the module names, command registration list, and Cargo crates required.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/commands/windows.rs src-tauri/src/commands/filesystem.rs src-tauri/src/media src-tauri/tests/filesystem.rs src-tauri/tests/media_protocol.rs
git commit -m "feat: port desktop filesystem and media access"
```

### Task 6: Port HTTP and Waveform Services

**Files:**
- Create: `src-tauri/src/commands/http.rs`
- Create: `src-tauri/src/commands/waveform.rs`
- Create: `src-tauri/src/media/waveform.rs`
- Create: `src-tauri/tests/http.rs`
- Create: `src-tauri/tests/waveform.rs`

**Interfaces:**
- Command `desktop_fetch(url, options)` returns `{ ok, status, statusText, data, headers }`.
- Commands `waveform_analyze`, `waveform_get_meta`, `waveform_get_level`, `waveform_delete` preserve current renderer shapes.
- Event `waveform-progress` carries `{ mediaId, fraction }` to the requesting window.
- Sidecar executable names are `ffmpeg` and `ffprobe` with Tauri target suffixing in release resources.

- [ ] **Step 1: Write HTTP validation and waveform math tests**

HTTP tests reject non-HTTP schemes and credential-bearing URLs, enforce a response-size ceiling, and preserve status/text/headers. Waveform tests port current peak expectations, no-audio parsing, cache round trips, progress monotonicity, cancellation cleanup, and cache deletion.

- [ ] **Step 2: Run tests to verify failure**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test http --test waveform`

Expected: compile failure because HTTP and waveform modules do not exist.

- [ ] **Step 3: Implement bounded desktop HTTP**

Use Reqwest with redirects limited to ten and revalidate every redirect target. Accept method, headers, and optional string body from the renderer. Stream into a bounded buffer, redact authorization values from diagnostics, and return a typed `response_too_large` error above the configured limit.

- [ ] **Step 4: Implement FFprobe and FFmpeg jobs**

Validate the approved media path and sanitized media ID, probe the first audio stream, decode `f32le` mono PCM, calculate min/max/RMS levels with the same samples-per-peak values as `electron/waveformEngine.ts`, write cache files atomically, and emit throttled monotonic progress. Kill the child process and remove temporary files when cancelled or when its owner window closes.

- [ ] **Step 5: Implement cache compatibility**

Preserve `WaveformMeta` JSON and the existing level response fields. Validate cache metadata before returning it and treat corrupt cache entries as misses after deleting them.

- [ ] **Step 6: Verify and report integration needs**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test http --test waveform`

Expected: all tests pass. Send the persistence worker exact command registration and sidecar permission requirements.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/commands/http.rs src-tauri/src/commands/waveform.rs src-tauri/src/media/waveform.rs src-tauri/tests/http.rs src-tauri/tests/waveform.rs
git commit -m "feat: port HTTP and waveform services to Rust"
```

### Task 7: Migrate Every Frontend Consumer and Desktop Component

**Files:**
- Move: `src/components/electron/**` to `src/components/desktop/**`
- Move: `src/pages/ElectronHomePage.tsx` to `src/pages/DesktopHomePage.tsx`
- Move: `src/pages/ElectronSettingsWindowPage.tsx` to `src/pages/DesktopSettingsWindowPage.tsx`
- Move: `src/pages/ElectronGlossaryWindowPage.tsx` to `src/pages/DesktopGlossaryWindowPage.tsx`
- Create: `src/types/desktop.ts`
- Rename: `src/stores/electronStorage.ts` to `src/stores/desktopStorage.ts`
- Modify: every current `window.electronAPI`, `isElectron`, Electron component/page/type import, and Electron copy call site found by `rg`
- Modify: `src/router/AppRouter.tsx`, `src/components/layout/AppLayout.tsx`, `src/pages/HomePage.tsx`, `src/services/aiService.ts`, `src/player/WaveformLoader.ts`, stores, repositories, migration bridge, glossary, language selector, and waveform UI
- Test: `tests/desktopFrontend.test.mjs`

**Interfaces:**
- Consumes `desktopApi` and `isDesktop` from Task 2.
- Produces no Electron-named production exports.
- Preserves all current component props and Zustand shapes unless a focused test documents the required transport-only difference.

- [ ] **Step 1: Write static architecture and route tests**

Tests enumerate source files and fail on `window.electronAPI`, `isElectron`, imports from `components/electron`, production filenames/exports prefixed `Electron`, or `@tauri-apps` outside the adapter. They assert all current routes lazy-load the desktop-neutral pages and `AppLayout` selects desktop/web through `isDesktop`.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `node --import tsx --test tests/desktopFrontend.test.mjs`

Expected: failures listing current Electron files and global accesses.

- [ ] **Step 3: Move domain types and storage adapter**

Move folder tree, media file, settings-window tab, waveform, health, recovery, and migration contracts into `src/types/desktop.ts`. Rename the Zustand storage adapter and preserve its async `StateStorage` behavior plus targeted rehydration events.

- [ ] **Step 4: Rename and migrate desktop UI**

Use `git mv` for all Electron components/pages, then update identifiers and imports. Replace direct globals with `desktopApi` methods. Implement Tauri drag/drop via the desktop adapter while retaining browser drag/drop in the web adapter. Preserve layout slots, folder behavior, data panels, and auxiliary-window chrome.

- [ ] **Step 5: Migrate shared consumers**

Inject desktop fetch in AI/transcription services, desktop waveform methods in `WaveformLoader`, desktop data methods in `dataClient`, and desktop config methods in stores/hooks. `nativePathToUrl` delegates to the desktop adapter media URL and retains a browser URL path for web files.

- [ ] **Step 6: Update translations and architecture documentation references**

Replace user-visible “Electron” with “desktop app” in English, Japanese, and Chinese. Keep internal migration references to Electron where they describe upgrade sources.

- [ ] **Step 7: Verify frontend parity checks**

Run: `node --import tsx --test tests/desktopApi.test.ts tests/desktopFrontend.test.mjs && npm run build && npm run lint`

Expected: tests, web build, and lint pass.

- [ ] **Step 8: Commit**

```bash
git add src tests/desktopApi.test.ts tests/desktopFrontend.test.mjs
git commit -m "refactor: migrate Electron UI to Tauri desktop facade"
```

### Task 8: Integrate Builds, Fix Baseline Tests, and Remove Electron

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Delete: `electron/**`
- Delete: `electron.vite.config.ts`
- Delete: `src/types/electron.d.ts`
- Delete or rename: Electron-specific tests
- Modify: existing failing tests and implementation proven incorrect by them
- Create: `scripts/verify-sidecars.mjs`
- Create: `.github/workflows/desktop.yml` if CI exists or no desktop workflow exists

**Interfaces:**
- Scripts: `dev:tauri`, `build:tauri`, `test`, `test:rust`, `check:tauri`, `verify:sidecars`.
- Removes Electron, electron-builder, electron-vite, electron-store, main entry, and Electron builder configuration.

- [ ] **Step 1: Add one deterministic test script and capture failures**

Set `test` to the exact Node/tsx invocation with required test environment configuration, rename the library sidebar environment variable/test to desktop terminology, and run `npm test`.

Expected before fixes: the known AI `window` failures and stale layout assertions fail.

- [ ] **Step 2: Correct the eight baseline failures**

Use the injected transport in AI tests so Node has no `window` dependency. Make the sidebar test import its desktop module directly. Update layout assertions only to match the currently intended design captured by the approved player specs; do not alter production layout solely to satisfy stale strings.

- [ ] **Step 3: Switch package and Vite integration**

Add current Tauri API/CLI and required plugins, add the six scripts above, configure Vite's fixed Tauri dev port and environment exclusions, and regenerate `package-lock.json`. `npm run build` remains the web build.

- [ ] **Step 4: Validate sidecars and build matrix configuration**

The sidecar script reads Tauri config, validates FFmpeg/FFprobe files for the target triple, checks executability on Unix, and exits nonzero with every missing path listed. CI runs TypeScript, Node tests, Rust format/clippy/tests, web build, sidecar validation, and Tauri no-bundle builds on macOS, Windows, and Linux.

- [ ] **Step 5: Remove Electron completely**

Delete Electron sources/configuration/types and remove packages/build metadata. Preserve only migration documentation, fixtures, changelog history, and Rust migration code that explicitly refer to the legacy source.

- [ ] **Step 6: Run automated completion audit**

Run:

```bash
npm test
npm run lint
npm run build
npm run check:tauri
npm run build:tauri -- --no-bundle
rg -n "electronAPI|from ['\"]electron['\"]|electron-vite|electron-builder|electron-store" src package.json vite.config.ts src-tauri
```

Expected: every command passes; the final search returns no production matches.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: replace Electron with Tauri"
```

### Task 9: Runtime Acceptance and Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/platform-architecture.md`
- Modify: `CHANGELOG.md`
- Create: `docs/tauri-acceptance.md`
- Create: `tests/e2e/desktop-smoke.spec.ts` if browser automation infrastructure is added

**Interfaces:**
- Documents Tauri/web development, builds, distribution, data migration, sidecars, permissions, and recovery.
- Produces an evidence table for every route and critical workflow in the design spec.

- [ ] **Step 1: Run route smoke automation**

Exercise `/`, `/player` with fixture media state, `/sentence-practice`, `/settings`, `/glossary`, and both auxiliary routes. Assert no uncaught errors and the primary interactive controls render.

- [ ] **Step 2: Run native workflow matrix**

Use representative audio, video-with-audio, silent video, transcript, YouTube item, and recording fixtures. Record pass/fail evidence for dialogs, drag/drop, folder watching, playback/seek/A-B loop, waveform/cache/fallback, transcription/explanation, recording save/reload/delete, persistence restart, auxiliary windows, data move/health/recovery, and Electron fixture migration.

- [ ] **Step 3: Update documentation**

Remove Electron development/distribution instructions. Document `npm run dev:tauri`, platform prerequisites, sidecar acquisition/license notices, migration source compatibility, data location, permissions, troubleshooting, and all verification commands.

- [ ] **Step 4: Run final requirement-by-requirement audit**

Compare `docs/tauri-acceptance.md` against every completion criterion in `docs/superpowers/specs/2026-07-03-tauri-migration-design.md`. Any missing or indirect evidence remains incomplete and must be tested before claiming completion.

- [ ] **Step 5: Commit**

```bash
git add README.md docs CHANGELOG.md tests/e2e
git commit -m "docs: document and verify Tauri migration"
```
