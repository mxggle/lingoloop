# Electron Library Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified, searchable, sortable Electron media-library sidebar.

**Architecture:** Keep all platform-specific behavior inside `src/components/electron`. Extract pure list derivation into a local helper so sorting and filtering are testable without rendering React. Reuse the existing player store and row primitives.

**Tech Stack:** React 18, TypeScript, Zustand, Electron preload API, Tailwind, lucide-react, Node built-in test runner for targeted helper validation.

---

### Task 1: Library Derivation Helper

**Files:**
- Create: `src/components/electron/librarySidebar.ts`
- Create: `tests/electron-library-sidebar.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a Node test that imports the compiled helper and verifies flattening, search, scope filtering, and sorting.

- [ ] **Step 2: Run test to verify it fails**

Run: compile helper to `/tmp/abloop-sidebar-test`, then run `node --test tests/electron-library-sidebar.test.mjs`.
Expected: FAIL because `librarySidebar.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement:
- `flattenFolderTree`
- `buildLibraryItems`
- `filterLibraryItems`
- `sortLibraryItems`

- [ ] **Step 4: Run test to verify it passes**

Run the same targeted test command.
Expected: PASS.

### Task 2: Unified Sidebar UI

**Files:**
- Modify: `src/components/electron/FolderBrowser.tsx`
- Modify: `src/components/electron/PlayHistory.tsx`
- Modify: `src/components/electron/ElectronAppLayout.tsx`

- [ ] **Step 1: Add controlled props to FolderBrowser**

Let `FolderBrowser` receive query/sort/scope inputs and render the new unified library controls from the parent.

- [ ] **Step 2: Integrate helper logic**

Use `buildLibraryItems`, `filterLibraryItems`, and `sortLibraryItems` to render filtered folder-source rows while preserving source folder refresh/watch behavior.

- [ ] **Step 3: Update ElectronAppLayout**

Replace separate Explorer/Recent sections with a Library section containing search, scope tabs, sort, and the unified browser. Keep bottom theme/settings controls and resize behavior.

- [ ] **Step 4: Keep PlayHistory compatible**

Retain `PlayHistory` for any existing direct use, but allow the unified sidebar to render recent rows through the new library path.

### Task 3: Localized Copy

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/zh.json`

- [ ] **Step 1: Add keys**

Add keys for search placeholder, scopes, sort labels, no results, and clear search.

- [ ] **Step 2: Replace fallback-only copy**

Use `t(...)` keys in Electron sidebar controls.

### Task 4: Verification and Review

**Files:**
- Review all changed files.

- [ ] **Step 1: Run targeted helper test**

Expected: PASS.

- [ ] **Step 2: Run `npm run build`**

Expected: PASS.

- [ ] **Step 3: Run `npm run lint`**

Expected: PASS or report existing unrelated failures if present.

- [ ] **Step 4: Review code**

Use the code-reviewer checklist: remove dead imports, avoid duplicated sort/filter logic, verify Electron/Web layer boundaries.
