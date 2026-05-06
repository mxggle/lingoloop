# Electron Library Sidebar Design

## Goal

Turn the Electron left sidebar into a unified media-library workspace for finding and opening files quickly.

## Selected Direction

Use the "Unified library" structure selected in brainstorming. The sidebar has one fixed control area at the top and one scrollable list below it:

- Search across folder-source files and recent-history items.
- Scope the list with All, Folders, and Recent tabs.
- Sort by last played, name, type, or source, with ascending/descending toggle.
- Keep file actions close to each row: play/open and reveal in Finder/Explorer.
- Keep folder-source management visible: add, refresh, reveal, remove.

## Architecture

The change remains inside the Electron UI layer. It reuses the existing player store data (`sourceFolders`, `mediaHistory`, `currentFile`, `currentYouTube`) and existing playback actions (`setCurrentFile`, `loadFromHistory`, `removeFromHistory`). It does not add web-only imports or change the shared player data model.

Add a small pure helper beside the Electron sidebar components for deriving searchable/sortable library items. This keeps list behavior testable without rendering React and keeps `FolderBrowser` focused on data loading and row rendering.

## UI Behavior

The sidebar top control region is always visible while the sidebar is open:

- A search input with a clear button.
- A compact segmented control: All, Folders, Recent.
- A sort select and direction button.
- Add folder remains in the Explorer/Library header.

The list behavior:

- Empty folder sources show the current add-folder empty state.
- Empty search results show a specific no-results state.
- Folder-source rows can expand/collapse and expose refresh/reveal/remove actions.
- File rows highlight the active native file and load via `setCurrentFile`.
- Recent rows highlight the active native file or YouTube item and load via `loadFromHistory`.

## Accessibility and UX

Use existing `SidebarRow` and `SidebarRowAction` patterns. Icon-only controls require `title` and `aria-label`. Focus styles must remain visible. The layout should be dense and predictable, closer to a file manager or professional media player than a marketing page.

## Testing

Add test coverage for the pure helper:

- Flatten nested folder trees into searchable file items.
- Filter by query across name/path/source.
- Sort by name, type, source, and recent activity.
- Include recent-history items in unified results.

Validate the app with:

- Targeted Node test for the helper.
- `npm run build`.
- `npm run lint`.
