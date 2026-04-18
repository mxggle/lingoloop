# Electron Settings Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Electron settings route with a true standalone native settings window and redesign the AI provider configuration area into a desktop split-pane layout while keeping existing auto-save behavior and storage keys.

**Architecture:** Keep native window lifecycle in Electron Layer 4, keep Electron API calls in preload plus Electron-only components, and move the settings UI into reusable shared Layer 2 components that can render inside either the current routed page or the new standalone settings window. Use a renderer-level settings-open intent so shared components can request settings without directly touching `window.electronAPI`.

**Tech Stack:** Electron, React 18, TypeScript, Vite, electron-vite, Tailwind CSS, Zustand, React Router, i18next.

---

## Delivery Rules

- Do not change storage keys for AI settings, transcription settings, theme settings, or playback settings.
- Keep auto-save; do not introduce Apply or Save buttons.
- Do not call `window.electronAPI` from shared files outside the allowed architecture boundaries.
- Keep `/settings` functional for the web app.
- Do not add a new test framework as part of this feature. This repo currently relies on `npm run lint`, `npm run build`, and Electron manual verification.
- Update locale files only if new user-facing copy is introduced:
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/ja.json`
  - `src/i18n/locales/zh.json`

## File Map

### Native window plumbing
- `electron/main.ts`
- `electron/preload.ts`
- `src/types/electron.d.ts`
- `src/router/AppRouter.tsx`

### Shared settings extraction
- `src/pages/SettingsPage.tsx`
- `src/hooks/useAiSettingsState.ts`
- `src/components/settings/SettingsWorkspace.tsx`
- `src/components/settings/SettingsSidebar.tsx`
- `src/components/settings/GeneralSettingsPanel.tsx`
- `src/components/settings/AISettingsPanel.tsx`
- `src/components/settings/AIProviderList.tsx`
- `src/components/settings/AIProviderDetail.tsx`

### Electron-only standalone shell
- `src/pages/ElectronSettingsWindowPage.tsx`
- `src/components/electron/SettingsWindowShell.tsx`

### Settings-open intent bridge
- `src/utils/settingsIntents.ts`
- `src/components/electron/ElectronAppLayout.tsx`
- `src/components/web/WebAppLayout.tsx`
- `src/components/transcript/TranscriptPanel.tsx`
- `src/components/layout/AppLayoutBase.tsx`

---

### Task 1: Add Native Settings Window Plumbing

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `src/router/AppRouter.tsx`

- [ ] **Step 1: Define the renderer-to-Electron settings window contract**

Add typed preload API signatures for:
- `openSettingsWindow(tab?: "general" | "ai", section?: string)`
- `closeSettingsWindow()`

Keep the contract narrow. Do not expose generic window-management methods.

- [ ] **Step 2: Implement singleton settings-window lifecycle in the main process**

In `electron/main.ts`:
- add a module-level `settingsWindow` reference
- create a focused `BrowserWindow` with independent size constraints
- reuse and focus the existing window when it is already open
- clear the reference on close

Load the dedicated renderer route using hash-based routing.

- [ ] **Step 3: Expose the settings-window bridge in preload**

Wire the new IPC handlers through `electron/preload.ts` and the `ElectronAPI` type so renderer code can request the settings window without importing Electron directly.

- [ ] **Step 4: Register a dedicated standalone renderer route**

In `src/router/AppRouter.tsx`, add a lazily loaded route such as `/settings-window` for the standalone settings surface.

Do not remove `/settings`; that route remains the web fallback and a safe compatibility path.

- [ ] **Step 5: Verify the new plumbing compiles**

Run:
```bash
npm run build
```

Expected:
- TypeScript and router imports compile
- preload and renderer type contracts stay aligned

- [ ] **Step 6: Commit the window plumbing**

```bash
git add electron/main.ts electron/preload.ts src/types/electron.d.ts src/router/AppRouter.tsx
git commit -m "feat: add native electron settings window plumbing"
```

---

### Task 2: Extract Shared Settings State and Panels Out of the Page Shell

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Create: `src/hooks/useAiSettingsState.ts`
- Create: `src/components/settings/SettingsWorkspace.tsx`
- Create: `src/components/settings/SettingsSidebar.tsx`
- Create: `src/components/settings/GeneralSettingsPanel.tsx`
- Create: `src/components/settings/AISettingsPanel.tsx`

- [ ] **Step 1: Move AI settings hydration and auto-save into a focused hook**

Create `src/hooks/useAiSettingsState.ts` and move the existing AI-settings responsibilities out of `SettingsPage`:
- load persisted values from `localStorage`
- debounce writes back to `localStorage`
- dispatch the existing `aiSettingsUpdated` and `ai-settings-updated` events
- expose provider state, transcription state, defaults state, and connection-test actions

Do not change storage key names.

- [ ] **Step 2: Create a shared settings workspace component**

Create `src/components/settings/SettingsWorkspace.tsx` to coordinate:
- top-level tab selection (`general` / `ai`)
- desktop navigation state
- page title/subtitle rendering
- shell variant props for routed-page vs standalone-window presentation

Keep this component free of Electron API calls.

- [ ] **Step 3: Split the current general settings UI into a focused panel**

Create `src/components/settings/GeneralSettingsPanel.tsx` and move the general-section rendering there:
- appearance
- interface layout toggles
- theme controls
- playback controls

Keep the existing Zustand store interactions unchanged.

- [ ] **Step 4: Create a shared AI settings panel entry point**

Create `src/components/settings/AISettingsPanel.tsx` to own:
- defaults subsection
- providers subsection entry
- transcription subsection

This component should accept the shared hook state and render desktop-oriented layout regions without assuming whether it lives inside the routed page or the standalone window.

- [ ] **Step 5: Convert `SettingsPage` into a thin routed wrapper**

Refactor `src/pages/SettingsPage.tsx` so it becomes a web-safe page wrapper around the new shared settings workspace rendered inside `AppLayout`.

Goal:
- keep `/settings` working
- remove most large inline JSX from the page file

- [ ] **Step 6: Verify the extraction stays clean**

Run:
```bash
npm run lint
```

Expected:
- the new hook and shared components type-check under ESLint
- no unused imports remain after extraction

- [ ] **Step 7: Commit the shared extraction**

```bash
git add src/pages/SettingsPage.tsx src/hooks/useAiSettingsState.ts src/components/settings
git commit -m "refactor: extract shared settings workspace and ai state"
```

---

### Task 3: Build the Standalone Electron Settings Shell

**Files:**
- Create: `src/pages/ElectronSettingsWindowPage.tsx`
- Create: `src/components/electron/SettingsWindowShell.tsx`
- Modify: `src/router/AppRouter.tsx`
- Modify: `src/components/settings/SettingsWorkspace.tsx`
- Modify: `src/components/settings/SettingsSidebar.tsx`

- [ ] **Step 1: Create the Electron-only settings window shell**

Create `src/components/electron/SettingsWindowShell.tsx` with:
- compact standalone desktop framing
- left navigation rail
- right content pane
- desktop header area
- auto-save status footer

Do not wrap this shell in `AppLayout`.

- [ ] **Step 2: Add the dedicated settings-window page**

Create `src/pages/ElectronSettingsWindowPage.tsx` that renders the shared settings workspace inside the standalone shell.

Use route query parameters or equivalent route state to select the initial tab/section when the window is opened.

- [ ] **Step 3: Teach the shared workspace about shell variants**

Update `SettingsWorkspace` so it can render appropriately in:
- routed settings page mode
- standalone Electron settings-window mode

Keep layout differences controlled by props rather than branching on platform inside shared code.

- [ ] **Step 4: Replace page-oriented header/navigation treatment with desktop window navigation**

Move the main section navigation from the top segmented control into a persistent left vertical navigation pattern for the standalone window.

Keep the routed page readable, but optimize the standalone shell for the screenshot-inspired desktop control-panel feel.

- [ ] **Step 5: Verify the standalone route builds**

Run:
```bash
npm run build
```

Expected:
- the standalone page loads through the router build path
- no route import cycles are introduced

- [ ] **Step 6: Commit the standalone shell**

```bash
git add src/pages/ElectronSettingsWindowPage.tsx src/components/electron/SettingsWindowShell.tsx src/components/settings src/router/AppRouter.tsx
git commit -m "feat: add standalone electron settings window shell"
```

---

### Task 4: Redesign the AI Provider Layout Into a Split-Pane Editor

**Files:**
- Modify: `src/components/settings/AISettingsPanel.tsx`
- Create: `src/components/settings/AIProviderList.tsx`
- Create: `src/components/settings/AIProviderDetail.tsx`
- Modify: `src/hooks/useAiSettingsState.ts`

- [ ] **Step 1: Replace the provider accordion with a stable provider-selection model**

In the shared AI state, track the selected provider for the providers subsection and remove reliance on accordion expansion as the primary interaction model.

Keep the preferred-provider concept separate from “currently selected in the editor.”

- [ ] **Step 2: Create the provider list component**

Create `src/components/settings/AIProviderList.tsx` that renders the left-side provider list with:
- provider name
- setup status
- active/preferred indicators where relevant

Selection should update the detail pane instead of expanding content inline.

- [ ] **Step 3: Create the provider detail editor**

Create `src/components/settings/AIProviderDetail.tsx` that renders the stable right-side form:
- OpenAI / Gemini / Grok: API key, model selector, connection test
- Ollama: base URL and model

Keep existing connection-testing behavior from `aiService`.

- [ ] **Step 4: Recompose the AI settings panel around the new split-pane layout**

Update `AISettingsPanel` so:
- Defaults remains a separate subsection
- Providers uses the new list/detail layout
- Transcription remains separate

Remove the existing hero-card plus accordion treatment from the providers subsection.

- [ ] **Step 5: Verify desktop layout and copy behavior**

Run:
```bash
npm run lint
```

Manual acceptance:
- provider selection feels stable, not collapsible
- detail forms do not jump vertically when switching providers
- auto-save still occurs after edits

- [ ] **Step 6: Commit the provider redesign**

```bash
git add src/components/settings src/hooks/useAiSettingsState.ts
git commit -m "feat: redesign ai provider settings into split pane editor"
```

---

### Task 5: Replace Direct Route Navigation With a Settings-Open Intent Bridge

**Files:**
- Create: `src/utils/settingsIntents.ts`
- Modify: `src/components/electron/ElectronAppLayout.tsx`
- Modify: `src/components/web/WebAppLayout.tsx`
- Modify: `src/components/transcript/TranscriptPanel.tsx`
- Modify: `src/components/layout/AppLayoutBase.tsx`

- [ ] **Step 1: Define a typed renderer-level settings-open intent**

Create `src/utils/settingsIntents.ts` containing:
- event name constant(s)
- detail types for requested tab/section
- small helper(s) that shared components can use to dispatch the intent without referencing Electron APIs

Keep this file platform-agnostic.

- [ ] **Step 2: Update shared components to emit the intent**

Replace direct `navigate("/settings?tab=ai")` usage in `TranscriptPanel` with the new settings-open intent helper.

If any other shared surface directly routes to settings, convert it in the same pass.

- [ ] **Step 3: Teach the Electron shell to open the native settings window**

In `ElectronAppLayout.tsx`:
- replace the direct settings-route navigation button with `window.electronAPI.openSettingsWindow(...)`
- listen for the renderer-level settings-open intent and forward it to the native settings window

- [ ] **Step 4: Keep a clean web fallback**

In `WebAppLayout.tsx` and shared header settings affordances:
- keep the normal `/settings` route behavior
- listen for the same intent and navigate to `/settings` with the requested tab/section

- [ ] **Step 5: Verify behavior manually and structurally**

Run:
```bash
npm run build
```

Manual acceptance:
- Electron settings button opens the native settings window
- repeated open requests focus the existing window
- transcript “open AI settings” opens the AI tab in Electron and still routes correctly on web

- [ ] **Step 6: Commit the bridge**

```bash
git add src/utils/settingsIntents.ts src/components/electron/ElectronAppLayout.tsx src/components/web/WebAppLayout.tsx src/components/transcript/TranscriptPanel.tsx src/components/layout/AppLayoutBase.tsx
git commit -m "feat: bridge settings requests to native electron window"
```

---

### Task 6: Final Polish and Verification

**Files:**
- Modify as needed: `src/components/settings/*`
- Modify as needed: `src/pages/ElectronSettingsWindowPage.tsx`
- Modify as needed: `src/pages/SettingsPage.tsx`
- Modify locale files only if new copy was introduced

- [ ] **Step 1: Remove obsolete layout assumptions from the old page implementation**

Delete leftover accordion-only state, page-only header logic, and routed-page assumptions that are no longer used after the extraction.

Keep the web fallback route intact.

- [ ] **Step 2: Sync any new user-facing strings across locales**

If new copy was introduced for:
- settings window labels
- section descriptions
- auto-save status
- provider-detail labels

then update:
- `src/i18n/locales/en.json`
- `src/i18n/locales/ja.json`
- `src/i18n/locales/zh.json`

- [ ] **Step 3: Run full verification**

Run:
```bash
npm run lint
npm run build
```

Expected:
- both commands pass cleanly

- [ ] **Step 4: Run final manual Electron acceptance**

Manual acceptance checklist:
- settings opens in a separate movable/resizable native window
- main app remains usable while settings is open
- reopening settings focuses the same window
- general settings still update the player correctly
- AI provider edits auto-save and propagate to the main app
- the provider layout matches the desktop split-pane interaction model

- [ ] **Step 5: Commit the final polish**

```bash
git add .
git commit -m "feat: ship standalone electron settings window"
```

---

## Completion Criteria

- Electron settings opens as a true standalone `BrowserWindow`
- `/settings-window` renders a dedicated standalone desktop shell
- `/settings` still works as the routed settings page fallback
- Shared components no longer directly route to Electron settings pages
- AI providers are edited through a stable split-pane layout instead of an accordion
- `npm run lint` passes
- `npm run build` passes
