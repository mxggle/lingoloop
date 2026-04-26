# Settings Workspace Redesign

**Date:** 2026-04-18

## Goal

Redesign the settings experience to mimic the approved reference layout and structure across the full settings workspace, while preserving the existing functionality, persistence behavior, and platform architecture.

The redesign should:

- Apply to both `General` and `AI`
- Use a compact desktop-style inner shell
- Keep the project’s existing theme direction rather than copying the reference colors
- Preserve current settings behavior rather than delivering a visual-only rewrite

## Approved Design Decisions

### 1. Full workspace redesign

The reference structure applies to the entire settings experience, not only to the AI provider area.

### 2. Persistent primary and secondary navigation

The redesigned workspace uses:

- A persistent primary left navigation rail for top-level settings tabs
- A persistent secondary navigation column for section/category selection inside the active tab
- A stable right-side detail pane for the currently selected section

This structure applies to both top-level tabs:

- `General`
- `AI`

### 3. General mirrors AI structurally

`General` should not remain a stacked page while `AI` uses split panes.

Instead, `General` should also become section-driven with its own persistent secondary navigation:

- `Appearance`
- `Interface Layout`
- `Theme`
- `Playback`

### 4. Visual direction

The approved visual direction is the closest structural adaptation of the reference.

That means:

- Stronger column definition
- Compact desktop-tool rhythm
- Tight inner header
- Stable detail pane

But it must still remain visually coherent with this application’s current theme system and surface treatment.

### 5. Compact header everywhere

Both:

- the in-app `/settings` route
- the Electron `/settings-window` route

should use the compact desktop-style inner header instead of keeping the current larger page header on the web route.

## Current State

## Settings workspace composition

- `src/pages/SettingsPage.tsx` renders the in-app settings route inside `AppLayout`
- `src/pages/ElectronSettingsWindowPage.tsx` renders the standalone Electron settings window inside `SettingsWindowShell`
- `src/components/settings/SettingsWorkspace.tsx` coordinates the shared settings content
- `src/components/settings/SettingsSidebar.tsx` currently handles top-level `General` / `AI` navigation

## General settings behavior

`src/components/settings/GeneralSettingsPanel.tsx` currently renders all General categories as one stacked page:

- appearance
- interface layout
- theme
- playback

These settings write live through the existing state layers:

- `useLayoutSettings`
- `useThemeStore`
- `usePlayerStore`

## AI settings behavior

`src/components/settings/AISettingsPanel.tsx` already contains AI sub-sections:

- defaults
- providers
- transcription

It also already preserves the important functional behavior:

- provider config editing
- API key visibility toggling
- connection testing
- transcription configuration
- immediate persistence through `useAiSettingsState`

## Routing state

- `SettingsWorkspace` already parses and builds search params for `tab` and AI `section`
- `ElectronSettingsWindowPage` already uses the shared route-state helpers
- `SettingsPage` only synchronizes the top-level `tab` and does not currently share the deeper section-state behavior

## Problems

### 1. The reference structure is only partially implemented

AI already has some split-pane behavior, but the total settings experience does not mimic the approved reference structure.

### 2. General and AI are structurally inconsistent

`General` is stacked while `AI` is sectioned. That prevents the settings workspace from feeling like one coherent tool surface.

### 3. Search-param behavior is inconsistent between web and Electron

The Electron settings window supports deeper shared route state than the web settings page. This increases the chance of behavior drift and weakens reusable layout logic.

### 4. The current web settings page header is too page-like

The current in-app route still uses a larger page header that does not match the approved compact control-panel direction.

## Design Summary

The redesigned settings workspace will use a consistent three-pane structure:

1. Primary navigation rail
2. Secondary section/category list
3. Detail pane

This structure will be shared across web and Electron settings surfaces.

No settings persistence model changes are required.

No explicit Save or Apply buttons are required.

No provider logic rewrite is required.

## Proposed Architecture

### Shared layout controller in `SettingsWorkspace`

`SettingsWorkspace` should become the central controller for:

- active top-level tab
- active section within the current tab
- section metadata for each tab
- shell composition for the reference-like layout

Responsibilities:

- render the compact shared settings shell
- render top-level navigation
- render the secondary section list for the current tab
- render the selected section detail view
- expose shared route-state parsing/building helpers

This keeps layout/state coordination centralized instead of splitting it across page-level wrappers.

### Shared section navigation component

Add a reusable component for the middle column section list.

It should be generic and shared, not AI-specific.

It will be used for:

- General sections
- AI sections

This component should support:

- active state
- icon/title/description presentation if needed
- compact desktop list-item styling aligned to the approved reference

### General settings become section-driven

`GeneralSettingsPanel` should stop rendering all sections at once.

Instead, it should accept an active General section and render only that section’s detail pane.

Recommended section IDs:

- `appearance`
- `layout`
- `theme`
- `playback`

This preserves the current setting controls but changes their presentation model.

### AI settings remove internal section toggle UI

`AISettingsPanel` should keep its current functional state behavior but stop owning its own visible segmented section control.

Instead:

- active AI section will come from shared workspace state
- the shared middle-column navigation will control section changes
- the AI detail area will render the selected AI section only

Recommended AI section IDs remain:

- `defaults`
- `providers`
- `transcription`

### Shared route-state model

Unify the route-state behavior across both settings pages.

The shared route-state helper should support:

- `tab`
- `section`

with safe defaults and validation for both top-level tabs.

Recommended behavior:

- invalid `tab` => `general`
- invalid General section => General default section
- invalid AI section => AI default section
- section values should imply the matching tab when applicable

This should be used by both:

- `SettingsPage`
- `ElectronSettingsWindowPage`

## Page Composition

### Web route: `SettingsPage`

`SettingsPage` should:

- stay inside `AppLayout`
- replace the current large header with a compact inner header aligned to the approved reference
- reuse the shared workspace shell and route-state helpers

The page should feel like a compact settings surface inside the existing app, not a separate marketing-style full page.

### Electron route: `ElectronSettingsWindowPage`

`ElectronSettingsWindowPage` should:

- continue using `SettingsWindowShell`
- reuse the same shared compact workspace composition inside the Electron shell
- continue syncing tab/section through shared route-state helpers

Electron-specific shell responsibilities should remain in Layer 3 and not leak into shared settings components.

## Functional Preservation Requirements

The redesign must preserve the following behaviors exactly:

### General settings

- language selection still updates correctly
- layout visibility toggles still update correctly
- theme preset changes and reset still work
- custom color changes still work
- playback seek settings still update live

### AI settings

- provider selection remains stable
- provider setup state remains accurate
- API key visibility toggles still work
- test connection still works
- stale connection-test protection remains intact
- model selection still works
- transcription provider configuration still works

### Persistence

- existing localStorage keys remain unchanged
- auto-save behavior remains unchanged
- switching sections or tabs must not reset in-memory form state

## UX Details

### Primary navigation

The left rail should remain the home for:

- `General`
- `AI`

It should visually mimic the approved reference structure:

- compact list items
- strong active state
- desktop utility-panel feel

### Secondary navigation

The middle column should remain stable for the active tab and behave like a section index.

For `General`:

- Appearance
- Interface Layout
- Theme
- Playback

For `AI`:

- Defaults
- Providers
- Transcription

### Detail pane

The detail pane should:

- render a clear section title and supporting text
- keep a stable card/form layout
- avoid accordion behavior
- preserve currently entered values when the user navigates away and back

## Implementation Strategy

### Phase 1: Shared route-state and navigation model

- extend `SettingsWorkspace` route-state helpers to cover both tabs and all sections
- update `SettingsPage` to consume the shared route-state model
- keep `ElectronSettingsWindowPage` aligned with the same helpers

### Phase 2: Shared shell redesign

- redesign the shared settings workspace shell to use the approved three-pane layout
- keep the primary navigation in the left rail
- add the shared secondary section navigation column
- introduce the compact inner header treatment

### Phase 3: General section refactor

- refactor `GeneralSettingsPanel` to render by active section instead of rendering all sections at once
- preserve current setting controls and state bindings

### Phase 4: AI section integration

- remove the internal AI segmented sub-navigation UI
- drive AI section rendering from shared workspace state
- preserve provider detail and transcription behavior

### Phase 5: Validation

- verify no persistence behavior regressed
- verify route-state synchronization on web and Electron
- run lint/build validation

## Risks

### 1. Route-state regressions

Unifying section state across web and Electron introduces a risk of broken deep links or stale tab/section combinations if the helpers are not strict enough.

Mitigation:

- centralize parsing/validation in one place
- use explicit defaults
- add focused tests around helper behavior

### 2. Hidden state resets during section switching

Refactoring `General` to render one section at a time could accidentally reset control state if derived incorrectly.

Mitigation:

- keep state ownership in the current stores/hooks
- ensure section switching only changes visible layout, not backing state

### 3. Overfitting to the reference visually

A literal visual copy could make the settings page feel disconnected from the rest of the app.

Mitigation:

- mimic layout and structural rhythm
- preserve project theme, surfaces, and typography direction where possible

## Validation Plan

Run:

- `npm run lint`
- `npm run build`

Manual verification:

- `/settings` preserves active tab and section through search params
- `/settings-window` preserves active tab and section through search params
- General settings controls update live
- AI provider switching works
- API key visibility toggles work
- connection testing still works
- transcription settings persist

## Out of Scope

- changing persistence keys
- adding explicit save/apply buttons
- redesigning Electron window lifecycle or IPC behavior
- changing provider validation logic
- changing AI/transcription business logic
