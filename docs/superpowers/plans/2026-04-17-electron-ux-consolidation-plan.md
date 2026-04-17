# Electron UX Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the Electron desktop experience around one coherent design system, simplify the active player workflow, improve desktop interaction quality, and remove stale desktop-facing UI variants after migration.

**Architecture:** Keep the current Electron route structure intact while improving the active route path first. Introduce a small set of shared desktop presentation primitives in Layer 2, adapt Electron shell/home/settings/player surfaces to those primitives, then remove obsolete UI surfaces only after the replacement path is stable. Respect the existing platform architecture: Electron-specific shell wiring stays in Layer 3/4, shared primitives and interaction components stay in Layer 2.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI Themes, Zustand, React Router.

---

## Delivery Rules

- Do not redesign the web app as part of this work.
- Do not change player persistence behavior in `AppRouter`.
- Do not move shared code into `components/electron/` if it belongs in Layer 2.
- Keep user-facing copy updates synchronized in:
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/ja.json`
  - `src/i18n/locales/zh.json`
- Prefer incremental PRs/commits by phase.

## File Map

### Active Electron route path
- `src/router/AppRouter.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/ElectronHomePage.tsx`
- `src/pages/PlayerPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/AppLayoutBase.tsx`
- `src/components/electron/ElectronAppLayout.tsx`

### Active shared desktop surfaces
- `src/components/controls/CombinedControls.tsx`
- `src/components/waveform/WaveformVisualizer.tsx`
- `src/components/transcript/TranscriptPanel.tsx`
- `src/components/transcript/TranscriptSegmentItem.tsx`
- `src/components/electron/FolderBrowser.tsx`
- `src/components/electron/PlayHistory.tsx`
- `src/components/ui/*`
- `src/stores/themeStore.ts`
- `src/utils/theme.ts`
- `src/App.tsx`

### Cleanup candidates
- `src/pages/AISettingsPage.tsx`
- `src/components/controls/PlaybackControls.tsx`
- `src/components/controls/PlayerControls.tsx`
- `src/components/controls/ABLoopControls.tsx`
- `src/components/controls/LoopControls.tsx`
- `src/components/transcript/TranscriptControls.tsx`
- `src/components/player/BookmarkManager.tsx`

---

### Task 1: Baseline the Active Electron UX Before Refactoring

**Files:**
- Inspect: `src/pages/PlayerPage.tsx`
- Inspect: `src/components/controls/CombinedControls.tsx`
- Inspect: `src/components/waveform/WaveformVisualizer.tsx`
- Inspect: `src/components/transcript/TranscriptPanel.tsx`
- Inspect: `src/components/electron/ElectronAppLayout.tsx`
- Inspect: `src/pages/ElectronHomePage.tsx`
- Inspect: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Document the active Electron command areas**

Create a short internal note in the PR description or implementation notes listing:
- primary player actions
- waveform-local actions
- transcript-local actions
- sidebar row actions
- settings entry points

This is required to prevent accidental duplication during refactoring.

- [ ] **Step 2: Confirm current route ownership**

Verify that the Electron path in `AppRouter` still resolves:
- `/` -> `HomePage` -> Electron path
- `/settings` -> `SettingsPage`
- `/player` -> persistent `PlayerPage`

- [ ] **Step 3: Run baseline verification**

Run:
```bash
npm run lint
npm run build
```

Expected:
- current branch passes, or failures are recorded before UI changes begin

- [ ] **Step 4: Commit baseline notes**

```bash
git add .
git commit -m "chore: baseline active electron ux before consolidation"
```

---

### Task 2: Introduce Shared Desktop Surface Primitives

**Files:**
- Create or modify: `src/components/ui/` shared primitives for desktop surfaces
- Modify: `src/components/electron/FolderBrowser.tsx`
- Modify: `src/components/electron/PlayHistory.tsx`
- Modify: `src/components/layout/AppLayoutBase.tsx`
- Test manually in Electron route surfaces

- [ ] **Step 1: Add a shared sidebar row primitive**

Create a focused shared component for:
- row container
- icon slot
- primary text
- secondary metadata
- action area
- selected/focused/hover states

Keep it generic enough for both folder browser and recent history rows.

- [ ] **Step 2: Add a shared sidebar row action primitive**

Create a shared action button wrapper for row-level actions like:
- reveal in file manager
- remove from recent
- quick-open

Must use semantic button elements and visible focus states.

- [ ] **Step 3: Add shared desktop card primitives**

Create a minimal set of shared cards for:
- compact panel sections
- hero/launcher cards

Do not create a large design system. Keep this limited to what Electron home/settings/shell needs.

- [ ] **Step 4: Replace layout-specific visual hacks**

Remove or reduce style injection and descendant overrides in `ElectronAppLayout` where shared primitives now own spacing and row behavior.

- [ ] **Step 5: Verify primitive adoption on sidebar surfaces**

Run:
```bash
npm run lint
```

Manual acceptance:
- folder browser and history rows share the same interaction model
- row actions are keyboard reachable
- focus and selection states are visually distinct

- [ ] **Step 6: Commit shared desktop primitives**

```bash
git add src/components/ui src/components/electron/FolderBrowser.tsx src/components/electron/PlayHistory.tsx src/components/layout/AppLayoutBase.tsx
git commit -m "feat: add shared desktop surface primitives for electron ui"
```

---

### Task 3: Fix Sidebar and Transcript Interaction Semantics

**Files:**
- Modify: `src/components/electron/FolderBrowser.tsx`
- Modify: `src/components/electron/PlayHistory.tsx`
- Modify: `src/components/transcript/TranscriptSegmentItem.tsx`
- Modify: `src/components/transcript/TranscriptPanel.tsx`

- [ ] **Step 1: Replace pseudo-buttons with semantic buttons**

Remove `span role="button"` patterns and `tabIndex={-1}` interaction traps from Electron sidebar rows and transcript row actions.

- [ ] **Step 2: Make critical row actions visible on focus/selection**

Row actions may stay visually subtle by default, but must become visible when:
- row is focused
- row is selected/active
- row action receives keyboard focus

- [ ] **Step 3: Add desktop-friendly action access**

Where reasonable, add one of:
- context menu trigger
- overflow menu
- shortcut hint

Do not add multiple competing patterns for the same action set.

- [ ] **Step 4: Run focused verification**

Run:
```bash
npm run lint
```

Manual acceptance:
- keyboard tab order reaches sidebar and transcript actions
- focus ring or equivalent state is visible
- hover is no longer the only way to discover row actions

- [ ] **Step 5: Commit interaction fixes**

```bash
git add src/components/electron/FolderBrowser.tsx src/components/electron/PlayHistory.tsx src/components/transcript/TranscriptSegmentItem.tsx src/components/transcript/TranscriptPanel.tsx
git commit -m "fix: improve electron row semantics and desktop action visibility"
```

---

### Task 4: Simplify the Player Screen Hierarchy

**Files:**
- Modify: `src/pages/PlayerPage.tsx`
- Modify: `src/components/controls/CombinedControls.tsx`
- Modify: `src/components/waveform/WaveformVisualizer.tsx`
- Modify: `src/components/transcript/TranscriptPanel.tsx`
- Inspect: `src/components/player/BookmarkDrawer.tsx`

- [ ] **Step 1: Define the primary command rail**

Choose `CombinedControls` as the single primary desktop rail for:
- transport
- loop start/end main actions
- bookmark/high-frequency session actions
- primary navigation shortcuts

Write the target ownership into implementation notes before editing.

- [ ] **Step 2: Remove duplicate or competing global actions**

In `WaveformVisualizer` and `TranscriptPanel`, keep only actions that are clearly local to those panes. Move duplicated global actions out of pane headers/toolbars.

- [ ] **Step 3: Reduce header/action density**

Refactor transcript and waveform headers so they emphasize:
- pane title/state
- a small number of local actions
- overflow for secondary options

- [ ] **Step 4: Preserve performance-sensitive behavior**

Do not regress:
- persistent player mount behavior
- transcript virtualization
- bookmark drawer behavior

- [ ] **Step 5: Run focused verification**

Run:
```bash
npm run lint
npm run build
```

Manual acceptance:
- the player view reads as one main workspace instead of stacked primary toolbars
- transport and loop actions are easy to locate
- waveform and transcript panes no longer compete with the main rail

- [ ] **Step 6: Commit player hierarchy changes**

```bash
git add src/pages/PlayerPage.tsx src/components/controls/CombinedControls.tsx src/components/waveform/WaveformVisualizer.tsx src/components/transcript/TranscriptPanel.tsx
git commit -m "refactor: simplify electron player command hierarchy"
```

---

### Task 5: Unify Electron Shell, Home, and Settings

**Files:**
- Modify: `src/components/electron/ElectronAppLayout.tsx`
- Modify: `src/components/layout/AppLayoutBase.tsx`
- Modify: `src/pages/ElectronHomePage.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/router/AppRouter.tsx` only if navigation behavior must be refined without changing route ownership

- [ ] **Step 1: Define the desktop surface rules**

Use the new shared primitives to establish:
- shell = compact utility surface
- home = lightweight launch surface
- settings = compact configuration surface

Document spacing, border, radius, and heading scale decisions in implementation notes.

- [ ] **Step 2: Refactor home to prioritize real desktop tasks**

Reduce emphasis on inactive or teaser content. Prioritize:
- open file
- open folder
- recent items
- resume last session or keyboard tips if available

- [ ] **Step 3: Refactor settings to behave like part of the shell**

Even if settings remains a route, it should preserve the shell’s visual model and feel like a continuation of the app instead of a separate landing page.

- [ ] **Step 4: Flatten overly decorative settings sections**

Reduce unnecessary glassy nesting and oversized hero blocks. Favor dense but readable grouped settings panels.

- [ ] **Step 5: Run focused verification**

Run:
```bash
npm run lint
npm run build
```

Manual acceptance:
- navigating between home, player, and settings feels visually continuous
- home emphasizes actual Electron workflows
- settings no longer reads like a separate app

- [ ] **Step 6: Commit shell/home/settings unification**

```bash
git add src/components/electron/ElectronAppLayout.tsx src/components/layout/AppLayoutBase.tsx src/pages/ElectronHomePage.tsx src/pages/SettingsPage.tsx src/router/AppRouter.tsx
git commit -m "feat: unify electron shell home and settings presentation"
```

---

### Task 6: Tune Theme Coherence

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/themeStore.ts`
- Modify: `src/utils/theme.ts`
- Modify if needed: theme-related UI in `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Decide theme ownership**

Choose one of:
- map selected app theme colors into Radix `Theme`
- narrow the app’s theme options so they no longer conflict with Radix accent behavior

Prefer the smaller change that preserves current customization expectations.

- [ ] **Step 2: Implement one coherent accent model**

Ensure dialogs, inputs, tabs, and shared Radix primitives visually align with the Electron theme selected by the user.

- [ ] **Step 3: Verify theme consistency**

Run:
```bash
npm run lint
npm run build
```

Manual acceptance:
- Radix primitives no longer feel like a different product
- light/dark and color settings remain functional

- [ ] **Step 4: Commit theme coherence updates**

```bash
git add src/App.tsx src/stores/themeStore.ts src/utils/theme.ts src/pages/SettingsPage.tsx
git commit -m "style: align radix theme behavior with electron theme settings"
```

---

### Task 7: Remove Stale Desktop-Facing UI Variants

**Files:**
- Delete or archive: `src/pages/AISettingsPage.tsx`
- Delete or archive: `src/components/controls/PlaybackControls.tsx`
- Delete or archive: `src/components/controls/PlayerControls.tsx`
- Delete or archive: `src/components/controls/ABLoopControls.tsx`
- Delete or archive: `src/components/controls/LoopControls.tsx`
- Delete or archive: `src/components/transcript/TranscriptControls.tsx`
- Delete or archive: `src/components/player/BookmarkManager.tsx`
- Modify exports/imports affected by cleanup
- Inspect: `src/components/transcript/index.ts`

- [ ] **Step 1: Confirm no active imports remain**

Run:
```bash
rg -n "AISettingsPage|PlaybackControls|PlayerControls|ABLoopControls|LoopControls|TranscriptControls|BookmarkManager" src
```

Expected:
- only intentional cleanup references remain before deletion

- [ ] **Step 2: Remove dead exports and files**

Delete or archive files only after confirming the active Electron path no longer depends on them.

- [ ] **Step 3: Repair index files and type-checking fallout**

Update any barrel exports or references left behind by cleanup.

- [ ] **Step 4: Run full verification**

Run:
```bash
npm run lint
npm run build
```

Expected:
- no missing import/export errors
- no route regressions

- [ ] **Step 5: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove stale electron ui variants after consolidation"
```

---

### Task 8: Final QA and Handoff Notes

**Files:**
- Modify if needed: `docs/` notes or PR summary

- [ ] **Step 1: Run final verification**

Run:
```bash
npm run lint
npm run build
```

- [ ] **Step 2: Perform manual Electron QA**

Verify in a real Electron window:
- home launch flow
- open file/folder flow
- recent history interactions
- keyboard navigation in sidebar and transcript
- player loop workflow
- settings navigation and theme changes

- [ ] **Step 3: Capture residual risks**

Document any remaining risks around:
- player/transcript action discoverability
- theme edge cases
- stale imports missed by cleanup
- Electron-only runtime behaviors not covered by build/lint

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "docs: finalize electron ux consolidation handoff"
```

---

## Acceptance Criteria

- The active Electron route path remains `Home -> Player -> Settings` with persistent player behavior intact.
- The player screen has one obvious primary command area.
- Waveform and transcript surfaces expose only local controls, not competing global toolbars.
- Sidebar and transcript row actions use semantic buttons and are keyboard reachable.
- Electron home and settings visually match the shell instead of feeling like separate products.
- Theme configuration is visually coherent with Radix primitives.
- Stale desktop-facing UI variants are removed or archived and no longer exported by active code paths.
- `npm run lint` passes.
- `npm run build` passes.

## Rollback Notes

- If player workflow changes regress discoverability or speed, revert Task 4 independently before reverting shell/theme work.
- If shared desktop primitives cause broad styling regressions, revert Task 2 and restore local styling ownership temporarily.
- If cleanup removes a surface still needed for fallback behavior, revert Task 7 only and re-run import audit before retrying.
