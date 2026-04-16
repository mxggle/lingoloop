# Transcript Performance And Smoothness Design

## Summary

This design improves transcript smoothness in two places without changing the
overall visual style:

1. Playback-driven active segment highlighting
2. Manual scrolling and interaction within the transcript list

The current transcript implementation already has the right foundations:
virtualization via `@tanstack/react-virtual`, a dedicated high-frequency
`currentTimeStore`, and memoized transcript text rendering. The remaining
smoothness issues appear to come from a smaller set of hot paths:

- Active-row styling currently changes text metrics and layout-related visual
  properties, which can make transitions feel jumpy.
- The auto-scroll path still performs repeated active-segment lookup work during
  playback.
- Visible transcript rows still do some repeated per-row work that is not needed
  on every interaction.

The goal of this pass is to keep the existing transcript UX and appearance as
close as possible while making the same UI feel materially smoother.

## Goals

- Preserve the current transcript visual style as closely as possible
- Make active-segment transitions feel smoother during playback
- Improve perceived smoothness while manually scrolling and interacting with
  transcript rows
- Reduce avoidable work during playback in the transcript panel
- Keep changes inside the shared transcript layer unless a very small hook
  update is needed

## Non-Goals

- No redesign of the transcript panel
- No change to transcript feature behavior such as selection, bookmark logic, AI
  explanation, or loop semantics
- No platform-specific changes for Electron vs web
- No broad refactor of transcript study generation or store architecture

## Current State

### Rendering path

- `TranscriptPanel.tsx` owns the filtered segment list, virtualization setup,
  auto-scroll subscription, and transcript controls
- `TranscriptSegmentItem.tsx` renders each visible segment row and owns row-level
  controls
- `TranscriptTextRenderer.tsx` renders transcript text and study highlights
- `useSegmentState.ts` derives `isActive`, `isPlaying`, and `isCurrentlyLooping`
  from `currentTimeStore` plus the main player store

### Known pressure points

1. Active row visual state changes typography and transform:
   - `TranscriptTextRenderer` changes font size and weight when active
   - `TranscriptSegmentItem` applies a translation animation to the text block
   - These changes can make the list feel like it is reflowing rather than
     smoothly emphasizing the current row

2. Auto-scroll currently uses repeated lookup:
   - `TranscriptPanel` subscribes to `currentTimeStore`
   - Each update may call `findIndex` on `filteredSegments`
   - This becomes steady work during playback and competes with user
     interaction

3. Visible rows still do repeated per-row work:
   - Bookmark matching scans bookmarks per row
   - Row props are mostly stable already, but some row-level computations can be
     made cheaper
   - Virtualized rows should avoid visual changes that alter measured height

## Proposed Approach

Use a conservative smoothing pass that keeps the existing UI structure and
behavior but removes layout-affecting motion, reduces playback-time lookup work,
and minimizes repeated work for visible transcript rows.

This is intentionally lower risk than a structural transcript rewrite.

## Design

### 1. Make active-segment emphasis compositor-friendly

Replace layout-affecting active-state styling with visually similar but more
stable emphasis.

#### Changes

- Keep text metrics stable between active and inactive states
  - Avoid changing text size between active and inactive rows
  - Avoid changing font weight in a way that materially shifts glyph layout
- Preserve the current emphasis through non-layout properties
  - Background fade
  - Opacity change
  - Small transform that does not affect measured row height in practice
  - Optional subtle accent treatment such as a left-side visual cue
- Tune animation timing for smoother handoff between segments
  - Use shorter, less “laggy” durations
  - Prefer easing that feels continuous rather than floaty

#### Why

The current active-row treatment likely feels rough not because the application
lacks animation, but because the row emphasis changes text metrics inside a
virtualized list. Stabilizing text layout should make transitions feel smoother
without changing the perceived design language.

### 2. Make auto-scroll boundary-aware instead of scan-heavy

Reduce active-segment lookup work in `TranscriptPanel`.

#### Changes

- Track the current active index in a ref
- On playback updates, first check whether the current time is still inside the
  current active segment
- Only advance or retreat when a segment boundary is crossed
- Fall back to a bounded search when needed after seeks, range changes, or
  bookmark filter changes
- Keep the current “optical center” scroll positioning behavior

#### Why

The current `findIndex` approach is simple but does unnecessary repeated work on
every subscribed update. A boundary-aware approach preserves behavior while
lowering the steady playback cost.

### 3. Keep virtualization measurements stable

Make virtualized rows less likely to trigger re-measure churn during playback.

#### Changes

- Avoid active-state style changes that materially alter row height
- Keep transforms subtle and height-neutral
- Preserve `measureElement`, but make the row’s measured layout more stable
- Avoid introducing animation wrappers that would cause extra layout complexity

#### Why

A virtualized list feels best when item measurements stay predictable. The
current list likely pays extra cost when the active row’s visual state changes
its measured text presentation.

### 4. Reduce repeated per-row work in visible items

Optimize row computations without changing behavior.

#### Changes

- Precompute bookmark membership for transcript rows in `TranscriptPanel`
  instead of scanning `bookmarks` inside every visible row
- Keep `TranscriptTextRenderer` focused on text/highlight rendering only
- Preserve memoization boundaries so playback-state changes do not invalidate
  expensive text span generation
- Avoid passing unstable props where a stable primitive or derived value will do

#### Why

Even with virtualization, visible rows are the hot path during interaction. A
small amount of removed work per visible row compounds into better smoothness.

## File-Level Scope

### `src/components/transcript/TranscriptPanel.tsx`

- Refine auto-scroll active-index tracking
- Potentially precompute bookmark lookup data for visible rows
- Keep virtualization API usage intact

### `src/components/transcript/TranscriptSegmentItem.tsx`

- Adjust active/inactive row styling to avoid layout-heavy transitions
- Consume lighter-weight bookmark state if derived in the parent
- Preserve existing row actions and selection behavior

### `src/components/transcript/TranscriptTextRenderer.tsx`

- Keep text metrics stable across active/inactive states
- Preserve study highlight rendering and selection support
- Avoid active-state styling that changes measured text layout

### `src/hooks/useSegmentState.ts`

- Keep the current time-store strategy
- Only change if a small refinement is needed to better support stable active
  state transitions

## Behavior Expectations

After implementation:

- The active transcript row should feel smoother when playback moves between
  segments
- The transcript list should feel more stable while scrolling during playback
- Manual browsing and row interaction should feel lighter
- The visible design should remain recognizably the same

## Risks

### Risk: Auto-scroll regressions around seeking or looping

Boundary-aware tracking can drift if the active index is not reset correctly
after a seek, loop jump, bookmark filter change, or transcript replacement.

Mitigation:

- Reset active-index refs when the filtered segment set changes
- Fall back to a bounded search after large time jumps
- Manually verify loop and seek transitions

### Risk: Active row loses too much emphasis

Reducing typography changes could make the active row feel weaker.

Mitigation:

- Preserve emphasis via color, opacity, background, and subtle transform
- Compare before/after visually during playback

### Risk: Interaction regressions in row controls or selection

Small row-level refactors can accidentally affect selection popovers, bookmark
actions, or explanation drawers.

Mitigation:

- Keep behavioral logic intact
- Limit changes to rendering and derived data flow
- Manually verify row interactions after implementation

## Validation Plan

### Functional checks

- Playback moves active highlighting correctly across segments
- Auto-scroll still follows the active segment correctly
- Manual scroll remains smooth with auto-scroll disabled
- Selection popover still appears and dismisses correctly
- Bookmark create/delete/play/edit behavior still works
- Segment playback and segment loop controls still behave the same
- Explanation drawer still opens and closes correctly

### Performance checks

- No visible layout “bump” when the active segment changes
- Reduced jank when scrolling the transcript list during playback
- No obvious degradation with large transcript lists

### Repository checks

- Run `npm run lint`
- Run `npm run build`

## Rollout Notes

- This work should be delivered as a focused transcript-layer optimization pass
- No migration or data-format change is expected
- Rollback is straightforward because the change is contained to transcript UI
  behavior and small helper logic

## Recommendation

Proceed with the conservative smoothing pass described here. It targets the most
likely causes of the perceived roughness while preserving the current transcript
design and staying aligned with the project’s existing performance architecture.
