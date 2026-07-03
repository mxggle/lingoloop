# Tauri Migration Acceptance

Last verified: 2026-07-03 on macOS x86_64.

## Automated verification

- `npm test`: 102 tests passed.
- `npm run build`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run check:tauri`: formatting, Clippy with warnings denied, and 38 Rust tests passed.
- `npm run prepare:sidecars` and `npm run verify:sidecars`: FFmpeg and FFprobe passed executable/version checks.
- `npm run build:tauri -- --no-bundle`: release executable build passed.
- `npx tauri build --bundles app`: macOS `Pawcast.app` bundle passed.
- Packaged `ffmpeg` and `ffprobe` were present beside the application executable and each passed `-version`.
- The packaged bundle identifier is `com.pawcast.desktop`.

## Runtime smoke verification

- `tauri dev` compiled and launched `target/debug/pawcast` successfully.
- The Tauri development frontend served successfully on its configured local URL.
- Existing missing source folders were rejected by the approved-path boundary without crashing the native process.

## Platform release verification

`.github/workflows/tauri.yml` runs the web, lint, sidecar, Rust, and release-build gates on macOS, Ubuntu, and Windows. Installers must still be smoke-tested on each target operating system before publishing.

The local macOS `.app` bundle succeeds. DMG generation reached the Finder layout step but the local Finder AppleEvent timed out (`-1712`); this is a host GUI automation failure in Tauri's generated `bundle_dmg.sh`, not an application compile or bundle-content failure.

## Manual coverage still required

The in-app browser automation surface was unavailable in this session. Before release, manually exercise file/folder selection, A-B playback, recording permissions, waveform generation, transcription providers, settings/glossary auxiliary windows, data-directory moves, and migration with a healthy legacy data set.
