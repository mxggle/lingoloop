# Homepage Redesign for Scalability and Visual Cohesion

## Objective
Redesign the `ElectronHomePage` to match modern dashboard best practices, accommodate future expansion (podcasts, RSS, etc.), resolve background color mismatches in internal components, and eliminate the vertical scrollbar.

## Key Changes

### 1. Layout Refactor (`src/pages/ElectronHomePage.tsx`)
- Transition from a 2-column card layout to a flexible 3-column (or responsive) grid.
- Use a "Dashboard Grid" approach where each entry point (Local, YouTube, and future sources) is a self-contained card.
- Incorporate a "Coming Soon" card for Podcasts to demonstrate future-proofing.
- Reduce vertical padding and spacing to ensure the entire view fits within the viewport without scrolling.

### 2. Styling Cohesion (`src/components/electron/ElectronFileOpener.tsx` & `src/components/player/YouTubeInput.tsx`)
- Modify internal components to use transparent backgrounds (`bg-transparent` or `bg-white/5`) instead of solid gray backgrounds.
- Ensure borders and shadows align with the parent cards in the homepage to remove the "ugly box" effect.
- Standardize height and corner radius across inputs and buttons for a seamless look.

### 3. Scalability
- The new grid layout allows for easy addition of new entry points by simply adding a new card to the grid.
- Use uniform card dimensions to maintain a balanced look as content grows.

## Component Specifics

#### `ElectronHomePage`
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
- Container: `max-w-6xl` instead of `max-w-4xl` to utilize more horizontal space.
- Spacing: `space-y-8` for the main content area.

#### `ElectronFileOpener`
- Remove solid background from the "Open File" button.
- Simplify the "Drag & Drop" area to be more subtle (dashed border, minimal padding).

#### `YouTubeInput`
- Make the input field background transparent with a subtle border.
- Align the "Load Video" button style with the primary action style of the app.

## Verification
- Visually confirm no scrollbar is present.
- Verify that backgrounds of all input areas match the card backgrounds perfectly.
- Ensure the layout remains responsive and looks good on different window sizes.
