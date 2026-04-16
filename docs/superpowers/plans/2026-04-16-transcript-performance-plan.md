# Transcript Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make transcript highlighting and transcript list interaction feel smoother without materially changing the current visual style.

**Architecture:** Keep the existing virtualized transcript architecture and dedicated `currentTimeStore`, but remove layout-affecting active-row transitions, reduce playback-time active-index lookup work, and trim repeated per-row work in the visible window. The implementation stays in the shared transcript layer and preserves current behavior for selection, bookmarks, looping, and explanation actions.

**Tech Stack:** React 18, TypeScript, Zustand, `@tanstack/react-virtual`, Tailwind CSS

---

## File Map

- Modify: `src/components/transcript/TranscriptPanel.tsx`
  - Replace repeated active-row scanning in auto-scroll with boundary-aware index tracking
  - Precompute lightweight bookmark membership for visible rows
- Modify: `src/components/transcript/TranscriptSegmentItem.tsx`
  - Switch active-row emphasis to layout-stable styles
  - Consume derived bookmark state from parent
- Modify: `src/components/transcript/TranscriptTextRenderer.tsx`
  - Keep text metrics stable between active/inactive states
  - Preserve memoized highlight rendering
- Optional modify: `src/hooks/useSegmentState.ts`
  - Only if small support changes are needed after transcript UI changes

## Task 1: Establish A Safe Baseline

**Files:**
- Modify: none
- Test: repository build/lint commands

- [ ] **Step 1: Confirm the worktree state**

Run: `git status --short`
Expected: clean worktree

- [ ] **Step 2: Check whether dependencies are already available**

Run: `test -d node_modules && echo present || echo missing`
Expected: either `present` or `missing`

- [ ] **Step 3: Run baseline lint if dependencies are present**

Run: `npm run lint`
Expected: pass, or report pre-existing failures before continuing

- [ ] **Step 4: Run baseline build if dependencies are present**

Run: `npm run build`
Expected: pass, or report pre-existing failures before continuing

## Task 2: Smooth The Active Row Without Changing The Visual Language

**Files:**
- Modify: `src/components/transcript/TranscriptSegmentItem.tsx`
- Modify: `src/components/transcript/TranscriptTextRenderer.tsx`

- [ ] **Step 1: Review the current active-row style inputs**

Read:
- `src/components/transcript/TranscriptSegmentItem.tsx`
- `src/components/transcript/TranscriptTextRenderer.tsx`

Expected: identify all active/inactive typography and transform differences

- [ ] **Step 2: Implement layout-stable row emphasis**

Change:
- Remove active/inactive text size changes
- Reduce or remove active/inactive font-weight shifts that alter text metrics
- Replace the current active emphasis with stable opacity/background/subtle transform treatment

Expected: active row still reads as active, but without visible layout bump

- [ ] **Step 3: Keep highlight rendering memoization intact**

Change:
- Preserve the existing `useMemo` span generation in `TranscriptTextRenderer`
- Ensure playback-state changes do not rebuild highlight spans unnecessarily

Expected: transcript text rendering remains stable and cheap during playback

- [ ] **Step 4: Run lint on the touched files through project lint**

Run: `npm run lint`
Expected: pass

## Task 3: Reduce Auto-Scroll Playback Cost

**Files:**
- Modify: `src/components/transcript/TranscriptPanel.tsx`

- [ ] **Step 1: Review the current auto-scroll logic**

Read:
- `src/components/transcript/TranscriptPanel.tsx`

Expected: confirm where `filteredSegments.findIndex(...)` is used during playback

- [ ] **Step 2: Implement boundary-aware active-index tracking**

Change:
- Track current active segment index in a ref
- Fast-path when playback remains inside the current segment
- Advance, retreat, or fall back to bounded search only when time crosses segment boundaries or after large jumps

Expected: auto-scroll reacts to segment changes without repeated full-list scans

- [ ] **Step 3: Reset tracking on transcript/filter changes**

Change:
- Reset active-index refs when `filteredSegments` changes materially
- Keep behavior correct around seek, loop, and bookmark-tab transitions

Expected: no stale active index after filtered transcript changes

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: pass

## Task 4: Reduce Visible Row Work

**Files:**
- Modify: `src/components/transcript/TranscriptPanel.tsx`
- Modify: `src/components/transcript/TranscriptSegmentItem.tsx`

- [ ] **Step 1: Move bookmark matching out of row-level repeated scans**

Change:
- Build a parent-level lookup structure keyed by segment id or time range signature
- Pass a cheap boolean such as `isBookmarked` into `TranscriptSegmentItem`

Expected: row rendering avoids scanning all bookmarks for every visible item

- [ ] **Step 2: Keep row props stable**

Change:
- Avoid passing values that churn when not needed
- Keep `handleClearSelection` and other row props stable

Expected: `React.memo` on `TranscriptSegmentItem` remains effective

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: pass

## Task 5: Verify Behavior End-To-End

**Files:**
- Modify: none unless fixes are needed

- [ ] **Step 1: Run full lint**

Run: `npm run lint`
Expected: pass

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: pass

- [ ] **Step 3: Perform manual transcript verification**

Verify:
- Playback active row transitions are smoother
- Auto-scroll still follows the active row
- Manual scrolling feels stable with and without auto-scroll
- Segment play/pause/loop/bookmark/explanation actions still work
- Selection popover still behaves correctly

Expected: no regressions in transcript behavior

- [ ] **Step 4: Commit the implementation**

Run:
- `git add src/components/transcript/TranscriptPanel.tsx src/components/transcript/TranscriptSegmentItem.tsx src/components/transcript/TranscriptTextRenderer.tsx docs/superpowers/plans/2026-04-16-transcript-performance-plan.md`
- `git commit -m "perf: smooth transcript highlighting and scrolling"`

Expected: clean commit containing the transcript optimization work
