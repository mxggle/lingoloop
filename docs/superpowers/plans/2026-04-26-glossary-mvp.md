# Glossary MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working personal glossary MVP where selected transcript text can be saved with context and reviewed later in a pure list.

**Architecture:** Store glossary entries in the shared Zustand player store so Electron and web share the same behavior. Use a small pure utility for entry construction and duplicate detection, then wire the transcript selection popover to save entries and add a `/glossary` route for review. Context playback jumps to the saved segment when the source media is currently active.

**Tech Stack:** React 18, TypeScript, Vite, Zustand persist, React Router, Tailwind CSS, lucide-react, i18next.

---

### Task 1: Glossary Data Model And Helpers

**Files:**
- Modify: `src/types/transcriptStudy.ts`
- Create: `src/utils/glossary.ts`
- Modify: `src/stores/playerStore.ts`

- [ ] Add `GlossaryEntry` and `CreateGlossaryEntryInput` types with selected text, context text, media identity, segment id, selection offsets, start/end times, and timestamps.
- [ ] Add pure helper functions for building IDs, constructing entries, and detecting duplicate entries.
- [ ] Extend `PlayerState` with `glossaryEntries`.
- [ ] Extend `PlayerActions` with add/delete/get/load-context glossary actions.
- [ ] Persist `glossaryEntries` through the existing Zustand partialize path.

### Task 2: Save From Transcript Selection

**Files:**
- Modify: `src/components/transcript/TranscriptSelectionPopover.tsx`
- Modify: `src/components/transcript/TranscriptSegmentItem.tsx`

- [ ] Pass the active segment into the selection popover.
- [ ] Add a `Save to Glossary` button beside the existing explanation action.
- [ ] On save, capture selected text plus full segment context and media metadata.
- [ ] Show translated success/duplicate/no-media feedback via toast.

### Task 3: Glossary Review Page

**Files:**
- Create: `src/pages/GlossaryPage.tsx`
- Modify: `src/pages/index.ts`
- Modify: `src/router/AppRouter.tsx`

- [ ] Add lazy `/glossary` route.
- [ ] Render a simple list of saved entries sorted newest first.
- [ ] Add play/jump action that calls the store context loader.
- [ ] Add delete action for cleanup.
- [ ] Show an empty state when no entries exist.

### Task 4: Translations And Validation

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/ja.json`
- Modify: `src/i18n/locales/zh.json`

- [ ] Add glossary page/action/toast copy.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
- [ ] Inspect `git diff` for unrelated changes.
