# Electron UX Consolidation Design

## Objective
Improve the active Electron desktop experience by reducing control density, unifying the visual system across routes, improving desktop interaction semantics, and removing stale desktop-facing UI surfaces once the replacement path is stable.

## Scope

### In Scope
- Active Electron player workflow
- Electron shell, home, and settings consistency
- Sidebar and transcript row interaction semantics
- Shared desktop presentation primitives used by Electron
- Cleanup of stale or unused desktop-facing UI surfaces after migration

### Out of Scope
- Web-specific redesign work
- New product features for playback, transcript AI, or library management
- Cross-platform architectural rewrites outside the existing layer rules

## Design Principles

### 1. Prioritize the active Electron path
All design effort should target the UI currently used by the Electron route path:
- `HomePage -> ElectronHomePage`
- `AppLayout -> ElectronAppLayout -> AppLayoutBase`
- `PlayerPage`
- `SettingsPage`

Older or alternate surfaces remain untouched until the replacement path is stable.

### 2. One primary command area per screen
The player screen should present one obvious command rail for transport and high-frequency actions. Waveform and transcript surfaces should keep only local actions that are directly tied to those panes.

### 3. One desktop visual language
Electron shell, home, and settings should share a compact desktop-oriented system for:
- Sidebar rows
- Panel cards
- Hero cards
- Section headers
- Focus, hover, selected, and active states

### 4. Desktop semantics over hover tricks
Critical actions in the sidebar and transcript should use real buttons, visible focus states, and keyboard-friendly behavior. Hover-only pseudo-controls should be removed from the main desktop workflows.

### 5. Cleanup only after migration
Stale UI surfaces should be removed only after the active Electron path covers the intended behavior and has been validated.

## Proposed Changes

### 1. Rebalance the player workspace
- Keep `CombinedControls` as the primary desktop command rail.
- Reduce duplicate or competing actions in `WaveformVisualizer` and `TranscriptPanel`.
- Move secondary actions into local menus, drawers, or inspector-style groups.
- Preserve persistent player behavior and transcript performance characteristics.

### 2. Unify Electron shell, home, and settings
- Keep settings within the desktop shell model, even if the route remains separate at first.
- Reduce the “showcase” card treatment in `ElectronHomePage` and `SettingsPage`.
- Make the home screen emphasize resume/open/recent workflows over teaser content.

### 3. Introduce desktop surface primitives
- Shared sidebar row primitive for explorer/history items
- Shared sidebar action primitive for row affordances
- Shared panel card primitive for settings and dense content sections
- Shared hero card primitive for home entry surfaces only

These should live in the shared UI layer and be styled for Electron usage without violating the platform architecture.

### 4. Improve desktop density and scanning
- Slightly increase sidebar row height
- Improve metadata legibility for long names and paths
- Strengthen active/selected/focused row states
- Reduce decorative nesting where it does not improve task flow

### 5. Align theme behavior
- Ensure Radix accent treatment does not conflict with the selected app theme
- Either map theme settings into the Radix theme layer or narrow the supported theme palette

### 6. Remove stale desktop-facing UI surfaces
After migration, remove or archive unused presentation variants so the repo reflects one real Electron design direction.

Candidate cleanup targets:
- `src/pages/AISettingsPage.tsx`
- `src/components/controls/PlaybackControls.tsx`
- `src/components/controls/PlayerControls.tsx`
- `src/components/controls/ABLoopControls.tsx`
- `src/components/controls/LoopControls.tsx`
- `src/components/transcript/TranscriptControls.tsx`
- `src/components/player/BookmarkManager.tsx`

## Verification
- Confirm the Electron player has one clear primary command area.
- Confirm sidebar and transcript row actions are keyboard reachable and visible on focus/selection.
- Confirm home, shell, and settings feel like one desktop product.
- Confirm stale UI surfaces are no longer referenced by the active route path.
- Run lint/build checks after each phase of active UI changes and after cleanup.
