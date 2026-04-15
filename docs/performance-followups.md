# Performance Follow-Ups

This file records unfinished or intentionally deferred items from the
performance optimization pass merged into `release/1.0.0-beta.1`.

## Remaining Bundle Issues

- The shared JS chunk `dist/assets/vendor-*.js` is still large at roughly 561 kB minified.
- The shared CSS chunk `dist/assets/ui-vendor-*.css` is still large at roughly 706 kB minified.

## Chunking Constraints Still Present

- `src/utils/mediaStorage.ts` is both statically and dynamically imported, so Vite cannot move it into a separate chunk under the current graph.
- `src/stores/shadowingStore.ts` had the same pattern during the worktree build analysis; some of that graph improved on merged build output, but the storage/shadowing import topology is still a chunking constraint.

## Suggested Next Optimization Pass

- Inspect the remaining generic `vendor` chunk with a bundle visualizer and split one more low-risk dependency family if it is still dominated by a clean boundary.
- Audit why Radix/theme-related CSS is producing a very large shared stylesheet and determine whether imports can be narrowed or deferred.
- Revisit `mediaStorage` and `shadowingStore` import paths so dynamic imports are not defeated by static imports in the same runtime graph.

## Intentionally Deferred Earlier

- Deep optimization of transcript-heavy UI paths was deferred during the conservative pass in order to avoid conflict-prone or higher-risk edits while integrating the broader performance work.
- The work focused first on route loading, media/playback hot paths, waveform/subscription churn, build chunking, and restoring a fully green lint/build baseline.
