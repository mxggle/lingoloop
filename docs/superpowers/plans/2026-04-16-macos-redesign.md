# macOS Sequoia Style Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the sidebar and player control bar to match macOS Sequoia aesthetics (translucency, floating pill-shaped controls).

**Architecture:** 
- Update `AppLayoutBase` to support floating overlays and adjusted padding.
- Refactor `ElectronAppLayout` for a full-height translucent sidebar.
- Refactor `CombinedControls` into a floating, pill-shaped component.

**Tech Stack:** React, TailwindCSS (backdrop-blur, transparency), Lucide Icons, Framer Motion.

---

### Task 1: Update Layout Foundation

**Files:**
- Modify: `src/components/layout/AppLayoutBase.tsx`

- [ ] **Step 1: Adjust layout constraints for floating controls**

Update `AppLayoutBase` to ensure the main content container handles the floating player bar correctly (adequate bottom padding, no layout overlap).

```tsx
// src/components/layout/AppLayoutBase.tsx

// Update bottomPaddingClassName default to accommodate floating pill
// From: bottomPaddingClassName = "pb-20 sm:pb-40"
// To: bottomPaddingClassName = "pb-24 sm:pb-32"

// Update main container classes to remove border-b and adjust background
// From: bg-white dark:bg-gray-900 fixed top-0 right-0 z-[55]
// To: bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl fixed top-0 right-0 z-[55]
```

- [ ] **Step 2: Commit layout foundation**

```bash
git add src/components/layout/AppLayoutBase.tsx
git commit -m "layout: update AppLayoutBase for translucent header and floating controls"
```

---

### Task 2: Redesign Sidebar (Electron)

**Files:**
- Modify: `src/components/electron/ElectronAppLayout.tsx`

- [ ] **Step 1: Implement translucent sidebar styling**

Refactor the sidebar aside element to use translucency and integrated title bar region.

```tsx
// src/components/electron/ElectronAppLayout.tsx

// Sidebar classes:
// From: bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
// To: bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border-r border-black/5 dark:border-white/5

// Update sidebar items to have rounded corners and subtle hover states
```

- [ ] **Step 2: Add User Profile section**

Add a profile section at the bottom of the sidebar as seen in the mockup.

- [ ] **Step 3: Commit sidebar changes**

```bash
git add src/components/electron/ElectronAppLayout.tsx
git commit -m "feat: redesign sidebar with macOS Sequoia translucency"
```

---

### Task 3: Redesign Player Control Bar

**Files:**
- Modify: `src/components/controls/CombinedControls.tsx`

- [ ] **Step 1: Refactor to floating pill container**

Change the fixed bottom bar into a floating, pill-shaped container.

```tsx
// src/components/controls/CombinedControls.tsx

// Container classes:
// From: fixed bottom-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700
// To: fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl z-[60]
```

- [ ] **Step 2: Reorganize internal layout (Left-Center-Right)**

Group playback buttons on the left, media info in the center, and secondary buttons on the right.

- [ ] **Step 3: Standardize icons and spacing**

Ensure icons and spacing match the Apple Music reference.

- [ ] **Step 4: Commit control bar changes**

```bash
git add src/components/controls/CombinedControls.tsx
git commit -m "feat: refactor player controls into a floating pill-shaped bar"
```

---

### Task 4: Final Polish and Responsiveness

**Files:**
- Modify: `src/components/controls/CombinedControls.tsx`
- Modify: `src/components/electron/ElectronAppLayout.tsx`

- [ ] **Step 1: Refine responsive behavior**

Ensure the floating pill bar collapses or adjusts on smaller windows. Ensure the sidebar translucency works correctly across themes.

- [ ] **Step 2: Verify and Commit**

```bash
npm run lint
git add .
git commit -m "style: final polish for macOS redesign and responsiveness"
```
