# Electron Settings Window Design

**Date:** 2026-04-17

## Goal

Convert settings from an in-app route into a true standalone Electron settings window for the desktop build, and redesign the AI provider section to use a desktop split-pane layout similar to the provided screenshots.

## Scope

- Electron desktop build only for standalone-window behavior
- Preserve existing settings persistence keys and auto-save behavior
- Keep the web version functional, but do not require parity with the standalone Electron window UX

## Current State

- Settings currently render as `#/settings` inside the main application window.
- Electron shell actions open settings by navigating the main renderer route.
- Shared components such as `TranscriptPanel` also navigate to the settings route directly.
- The AI provider UI is currently an accordion-based page inside `SettingsPage`.

## Problems

### 1. Settings do not behave like a desktop window

The current route-based settings page cannot be moved, resized, or positioned independently from the main player window.

### 2. The settings layout is page-oriented, not desktop-oriented

The current view uses large stacked cards and segmented controls, which does not match the desktop control-panel layout shown in the screenshots.

### 3. Settings triggers are coupled to router navigation

Electron-specific actions currently use route navigation instead of native window management. That makes the Electron desktop workflow harder to evolve cleanly.

## Decision Summary

### 1. Use a true secondary Electron `BrowserWindow`

For the Electron build, settings will open in a dedicated singleton `BrowserWindow`.

This window will:

- Open from the main app on demand
- Focus the existing settings window if already open
- Be movable and resizable by the OS window manager
- Remain modeless so the main player window stays interactive

### 2. Keep auto-save

The settings window will continue using auto-save rather than explicit Save/Apply buttons.

Rationale:

- Existing app behavior already persists settings immediately
- Transcript and AI surfaces already react to live settings changes
- The requested screenshots are visual references, not a requirement to add explicit save semantics

### 3. Split standalone-window shell from settings content

The shared settings content should not stay tightly coupled to `AppLayout`.

The design will separate:

- A standalone Electron settings-window shell
- Reusable settings content sections
- Electron-specific window-opening behavior

This preserves architecture boundaries while letting the desktop window use a different shell than the main app.

## Proposed Architecture

### Electron main process

Add settings-window lifecycle management in `electron/main.ts`.

Responsibilities:

- Create a singleton settings `BrowserWindow`
- Load a dedicated renderer route for the settings window
- Accept an optional initial tab/section
- Restore focus instead of opening duplicates
- Clear the stored reference when the window closes

Recommended window characteristics:

- Width around 980-1120
- Height around 720-820
- Reasonable `minWidth` and `minHeight`
- `titleBarStyle: 'hiddenInset'` to match the app
- Non-modal

### Preload and IPC contract

Extend the Electron bridge to expose a narrow settings-window API.

Proposed API:

- `openSettingsWindow(tab?: "general" | "ai", section?: string): Promise<void>`
- `closeSettingsWindow(): Promise<void>`

This keeps native window concerns in Electron-only layers and avoids leaking direct `ipcRenderer` usage into shared code.

### Renderer routing

Add a dedicated renderer route for the standalone settings window, such as `#/settings-window`.

This route will render a dedicated Electron settings-window page rather than the standard app shell.

The current `/settings` route can remain available as a fallback for the web build and any legacy navigation paths.

### Shared vs Electron-specific responsibilities

#### Electron-only

- Window creation and focus
- Opening the standalone settings window from the desktop shell
- Standalone desktop settings-frame presentation

#### Shared

- Settings form controls
- Local storage keys and debounced auto-save
- Provider config state and connection testing

### Settings open requests from shared UI

Shared components must not directly call `window.electronAPI`.

To keep architecture clean:

- Shared components will dispatch a renderer-level intent such as an app event or context action for “open settings”
- Electron-specific shell code will translate that intent into `window.electronAPI.openSettingsWindow(...)`
- Web behavior can continue to route to `/settings`

This avoids violating the repository rule that shared layers must not call Electron APIs directly.

## Settings Window UX

## Overall shell

The standalone settings window will use a desktop control-panel layout:

- Compact outer frame with desktop padding
- Left vertical navigation rail
- Right detail pane
- Header area with section title and supporting text
- Auto-save status in the footer or lower edge, but no primary Save button

The goal is a native desktop utility-window feel, not a full-page app screen.

### Primary navigation

Top-level navigation remains:

- General
- AI

This will move from the current top segmented control into a left-hand vertical navigation list inside the settings window.

### General section

General settings can keep the current categories but should be visually compressed for desktop:

- Appearance
- Interface layout
- Theme
- Playback

This section can use stacked panels in the right content pane.

### AI section

The AI area should move away from the current large overview-card plus accordion structure.

Recommended structure:

- Left AI sub-navigation/provider list
- Right provider detail editor

Subsections:

- Defaults
- Providers
- Transcription

## AI Provider Layout

### Target interaction model

The provider area should resemble a desktop admin panel:

- A provider list on the left
- A stable detail form on the right
- No expanding/collapsing cards

### Provider list behavior

The provider list should show:

- Provider name
- Setup status
- Active/default indication where relevant

Selecting a provider updates the detail pane instead of expanding an accordion card.

### Provider detail pane

The detail pane should show provider-specific controls in a stable layout:

- OpenAI / Gemini / Grok:
  - API key
  - Model selector
  - Test connection action
- Ollama:
  - Base URL
  - Model field

Supporting description text can stay in the detail pane, but should not dominate the layout.

### Defaults section

The defaults area should remain separate from provider editing and keep:

- Preferred provider
- Target language
- Temperature
- Max tokens

This avoids overloading the provider detail pane with unrelated global settings.

## Implementation Strategy

### Phase 1: Native settings window plumbing

- Add main-process settings-window creation and singleton management
- Expose preload methods for opening/focusing the settings window
- Add a dedicated renderer route for the settings window

### Phase 2: Shell separation

- Extract shared settings content out of the current page-oriented shell
- Add a dedicated Electron settings-window page/shell
- Update Electron settings triggers to open the native window

### Phase 3: AI layout redesign

- Replace provider accordion UI with a split-pane provider editor
- Keep existing persistence and connection-testing logic
- Preserve current provider/transcription state behavior

### Phase 4: Shared-trigger cleanup

- Replace direct route navigation from shared components with an architecture-safe settings-open intent
- Keep web fallback behavior intact

## Risks

### 1. Shared-component opening behavior

`TranscriptPanel` currently routes directly to `/settings?tab=ai`. That cannot remain the Electron path if the goal is a true secondary window.

Mitigation:

- Introduce a renderer-level open-settings intent that Electron and web can handle differently

### 2. Duplicated settings logic

If the standalone window gets implemented by copying the whole page, future maintenance will drift quickly.

Mitigation:

- Extract reusable settings sections and keep persistence logic shared

### 3. Cross-window state assumptions

The app already relies on `localStorage` and window events for settings updates. Separate windows can expose timing issues if assumptions are too narrow.

Mitigation:

- Preserve debounced saves
- Keep existing update events
- Verify that the main window reacts to settings changes while the settings window remains open

## Validation Plan

- Confirm the settings button in Electron opens a separate native window
- Confirm repeated opens focus the existing settings window instead of duplicating it
- Confirm the settings window is movable and resizable
- Confirm AI settings still auto-save and affect the main app without reopening the app
- Confirm transcript/provider-related flows still open the AI settings surface correctly in Electron
- Confirm web still has a functional settings route

## Recommended Files To Change

- `electron/main.ts`
- `electron/preload.ts`
- `src/types/electron.d.ts`
- `src/router/AppRouter.tsx`
- `src/pages/SettingsPage.tsx`
- New Electron-only settings window page/component files under `src/components/electron/` and/or `src/pages/`
- `src/components/electron/ElectronAppLayout.tsx`
- `src/components/layout/AppLayoutBase.tsx`
- `src/components/transcript/TranscriptPanel.tsx`

## Non-Goals

- Reworking all settings semantics
- Adding multi-window synchronization infrastructure beyond what is needed for current settings persistence
- Matching the screenshots pixel-for-pixel
- Giving the web app the same standalone-window behavior
