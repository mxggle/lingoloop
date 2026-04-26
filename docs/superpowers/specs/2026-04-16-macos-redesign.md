# macOS Sequoia Style Layout Redesign

## Objective
Redesign the application layout to match modern macOS system aesthetics, specifically focusing on a full-height translucent sidebar and a floating, pill-shaped player control bar.

## Key Changes

### 1. Sidebar Redesign (`src/components/electron/ElectronAppLayout.tsx`)
- Transition to a full-height, translucent sidebar using `backdrop-filter: blur(20px)` and semi-transparent backgrounds.
- Integrate the title bar draggable region directly into the sidebar flow.
- Style sidebar items with rounded corners, subtle hover states, and clear active indicators.
- Use section headers (Library, Playlists) with minimalist typography.
- Add a user profile section at the bottom.

### 2. Player Control Bar Redesign (`src/components/controls/CombinedControls.tsx`)
- Refactor the fixed bottom bar into a floating, pill-shaped container positioned at the bottom center of the window.
- Implement translucency (`backdrop-blur`) and a subtle shadow to give it a "floating" appearance.
- Reorganize the internal layout:
    - **Left**: Primary playback controls (Prev, Play/Pause, Next).
    - **Center**: Current media information (Title, Artist/Source) with artwork and a compact menu button.
    - **Right**: Secondary controls (Volume, Lyrics/Transcript, Playlist/Recent).
- Standardize icon sizes and spacing to match the Apple Music reference.

### 3. Core Layout Adjustments (`src/components/layout/AppLayoutBase.tsx`)
- Update the main layout container to support the floating control bar by adjusting bottom padding and ensuring the control bar correctly floats over content.
- Ensure the sidebar and control bar handle theme switching (light/dark) while maintaining translucency.

## Component Specifics

#### `ElectronAppLayout`
- Remove solid borders where possible, replace with semi-transparent lines.
- Refine the resize handle to be nearly invisible but functional.

#### `CombinedControls`
- Change from `fixed bottom-0 left-0 right-0` to `fixed bottom-8 left-1/2 -translate-x-1/2`.
- Set a fixed or max-width (e.g., `max-w-3xl`) for the pill.
- Ensure responsive behavior (e.g., span full width on very small screens).

## Verification
- Visually confirm the translucency and blur effects on both sidebar and player bar.
- Verify that all controls remain functional in their new positions.
- Test responsiveness across different window sizes.
- Confirm dark/light mode consistency.
