# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `ElectronHomePage` into a scalable 3-column dashboard grid with seamless styling and no vertical scrollbar.

**Architecture:** Refactor the homepage to use a responsive grid of self-contained cards. Update child components (`ElectronFileOpener`, `YouTubeInput`) to support transparent backgrounds, eliminating visual "boxes."

**Tech Stack:** React, TailwindCSS, Framer Motion, Lucide Icons.

---

### Task 1: Update ElectronFileOpener Styling

**Files:**
- Modify: `src/components/electron/ElectronFileOpener.tsx`

- [ ] **Step 1: Make backgrounds transparent and borders subtle**

Modify the main button and drag-drop zone to use `bg-transparent` and a more subtle border.

```tsx
// src/components/electron/ElectronFileOpener.tsx

// Update the main button's className:
// From: bg-white dark:bg-gray-800
// To: bg-transparent hover:bg-white/5 dark:hover:bg-white/5

// Update the drag-drop div's className:
// From: border-gray-200 dark:border-gray-700
// To: border-gray-200/50 dark:border-gray-800/50
```

- [ ] **Step 2: Commit styling changes**

```bash
git add src/components/electron/ElectronFileOpener.tsx
git commit -m "style: make ElectronFileOpener backgrounds transparent"
```

---

### Task 2: Update YouTubeInput Styling

**Files:**
- Modify: `src/components/player/YouTubeInput.tsx`

- [ ] **Step 1: Make input background transparent**

Update the motion.input to use a transparent background and consistent borders.

```tsx
// src/components/player/YouTubeInput.tsx

// Update input className:
// From: bg-white dark:bg-gray-800
// To: bg-transparent hover:bg-white/5 dark:hover:bg-white/5
```

- [ ] **Step 2: Commit styling changes**

```bash
git add src/components/player/YouTubeInput.tsx
git commit -m "style: make YouTubeInput background transparent"
```

---

### Task 3: Refactor ElectronHomePage Layout

**Files:**
- Modify: `src/pages/ElectronHomePage.tsx`

- [ ] **Step 1: Implement the 3-column Dashboard Grid**

Refactor the grid and card styles. Add a "Podcasts" placeholder card.

```tsx
// src/pages/ElectronHomePage.tsx

// 1. Increase max-w-4xl to max-w-6xl
// 2. Change grid-cols-2 to grid-cols-1 md:grid-cols-2 lg:grid-cols-3
// 3. Update card backgrounds to match the mockup: bg-white dark:bg-gray-900/40
// 4. Ensure min-h and overflow settings prevent the scrollbar
```

- [ ] **Step 2: Add Podcasts "Coming Soon" card**

```tsx
// Add this card to the grid in src/pages/ElectronHomePage.tsx
<motion.div 
  whileHover={{ y: -5 }}
  className="group relative opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
>
  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
  <div className="relative bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-8 rounded-3xl h-full flex flex-col transition-all group-hover:border-purple-500/30">
    <div className="mb-6 flex items-center justify-between">
      <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
        <Mic className="w-6 h-6" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Coming Soon</span>
    </div>
    <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">Podcasts & RSS</h3>
    <div className="flex-1 flex flex-col justify-center py-2">
      <div className="h-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center">
        <span className="text-gray-400 dark:text-gray-600 text-xs text-center px-4">Direct RSS link support and podcast discovery</span>
      </div>
    </div>
  </div>
</motion.div>
```

- [ ] **Step 3: Commit layout changes**

```bash
git add src/pages/ElectronHomePage.tsx
git commit -m "feat: redesign homepage to 3-column dashboard grid"
```

---

### Task 4: Final Polish and Scrollbar Removal

**Files:**
- Modify: `src/pages/ElectronHomePage.tsx`

- [ ] **Step 1: Adjust vertical spacing and overflow**

Ensure `min-h-[calc(100vh-80px)]` and container paddings are optimized to avoid the scrollbar. Use `overflow-hidden` if necessary on the main container.

```tsx
// src/pages/ElectronHomePage.tsx
// Check py-10 -> py-6 or similar if scrollbar persists
```

- [ ] **Step 2: Verify and Commit**

```bash
npm run lint
git add src/pages/ElectronHomePage.tsx
git commit -m "style: final spacing polish to remove scrollbar"
```
