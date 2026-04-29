# Settings Page Redesign — Design Specification

**Date:** 2025-01-28
**Approach:** Linear / Raycast / Vercel Dashboard Minimal Professional
**Stack:** React 18 + TypeScript + Tailwind CSS + Radix UI (shadcn/ui primitives)

---

## Design Principles

1. **Minimal chrome** — Content is king. Every decorative element must earn its place.
2. **Consistent primitives** — Reuse existing shadcn/ui `Card`, `Button`, `Input`, `Tabs`, `Label`. No custom one-off styles.
3. **Clear hierarchy** — Section title → Label → Description → Control. One visual path.
4. **Desktop-native feel** — Sidebar navigation, keyboard-accessible, no mobile-first compromises on desktop.
5. **Theme-aware** — Respect the existing dynamic color system (`primary-500`, `accent-500`, dark mode via `dark:`).

---

## Layout Architecture

```
┌─────────────────────────────────────────────┐
│  Settings Page (Web)                        │
│  ┌────────┬─────────────────────────────┐   │
│  │Sidebar │  Content Area               │   │
│  │ 200px  │  max-w-3xl                  │   │
│  │ fixed  │  scrollable                 │   │
│  └────────┴─────────────────────────────┘   │
└─────────────────────────────────────────────┘

Electron Settings Window:
- Same layout but integrated into SettingsWindowShell
- Remove the outer page chrome (no back button, no AppLayout wrapper)
```

---

## Component Inventory

### New Components

| Component | Purpose | Location |
|---|---|---|
| `SettingsSection` | Unified section header (title + optional description + optional action) | `components/settings/SettingsSection.tsx` |
| `SettingsRow` | Uniform setting row: label + description left, control right | `components/settings/SettingsRow.tsx` |
| `SettingsSwitch` | Wrapper around a custom toggle to match shadcn style | `components/ui/switch.tsx` (new) |

### Modified Components

| Component | Changes |
|---|---|
| `SettingsSidebar` | Solid active state (`bg-primary-500 text-white`), remove descriptions, compact 200px width, consistent with Electron sidebar style |
| `SettingsPage` | Two-column sidebar+content layout, remove decorative header/footer, simplify |
| `SettingsWorkspace` | Remove horizontal tabs (replaced by sidebar), keep only content switching |
| `GeneralSettingsPanel` | Use `SettingsSection` + `SettingsRow`, standard shadcn `Card`, remove uppercase labels |
| `AISettingsPanel` | Use shadcn `Tabs` for sub-navigation, `SettingsSection` + `SettingsRow` for forms |
| `AIProviderList` | Simplify list items, standard card styling |
| `AIProviderDetail` | Use `SettingsSection` + `SettingsRow`, standard inputs |
| `SettingsWindowShell` | Remove heavy radial gradient, use subtle bg, compact header |
| `ElectronSettingsWindowPage` | Adapt to new SettingsSidebar + SettingsWorkspace |

---

## Visual Token Spec

### Typography
- **Section title:** `text-base font-semibold text-gray-900 dark:text-gray-100`
- **Row label:** `text-sm font-medium text-gray-900 dark:text-gray-100`
- **Row description:** `text-sm text-gray-500 dark:text-gray-400`
- **No uppercase. No tracking-widest.**

### Spacing
- **Sidebar width:** `w-[200px]`
- **Content max-width:** `max-w-3xl`
- **Section gap:** `space-y-6`
- **Card padding:** `p-6`
- **Row internal padding:** `py-4 px-6` inside card

### Colors (reuse existing theme)
- **Card bg:** `bg-white dark:bg-gray-950` (standard shadcn Card)
- **Card border:** `border-gray-200 dark:border-gray-800`
- **Active sidebar item:** `bg-primary-500 text-white`
- **Hover sidebar item:** `hover:bg-gray-100 dark:hover:bg-gray-800`
- **Page background:** inherit from `AppLayoutBase`

### Form Controls
- **Input height:** `h-10` (standard shadcn Input)
- **Input border-radius:** `rounded-md`
- **Switch:** 44x24px, `bg-primary-500` when on

---

## Interaction Spec

- **Sidebar items:** Click switches tab instantly. Active state is solid fill.
- **Settings rows:** Hover shows `bg-gray-50 dark:bg-gray-900/50` inside card rows.
- **Cards:** No shadow elevation changes on hover. Subtle border color shift only.
- **Transitions:** `transition-colors duration-200` globally.

---

## Accessibility

- All form inputs have associated `<Label>`
- Sidebar uses `<nav aria-label="Settings">`
- Focus rings use existing shadcn `focus-visible:ring-2 focus-visible:ring-primary-500`
- Skip link not needed (only 2 tabs)

---

## i18n Updates

All user-facing copy changes must update:
- `src/i18n/locales/en.json`
- `src/i18n/locales/ja.json`
- `src/i18n/locales/zh.json`

---

## Rollback Plan

If issues arise:
1. Revert modified files to HEAD
2. Delete new component files
3. Restore `src/components/settings/SettingsSidebar.tsx` from git
