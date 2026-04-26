# Task 4: Final Polish and Scrollbar Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the homepage fits within the viewport without a vertical scrollbar and apply final spacing refinements.

**Architecture:** Adjust vertical padding and spacing in `ElectronHomePage.tsx` and ensure the container height is correctly calculated to avoid overflow in the `AppLayoutBase` main container.

**Tech Stack:** React, Tailwind CSS, Framer Motion

---

### Task 1: Refine Spacing and Height in ElectronHomePage.tsx

**Files:**
- Modify: `src/pages/ElectronHomePage.tsx`

- [ ] **Step 1: Reduce vertical padding and spacing**

Modify `src/pages/ElectronHomePage.tsx` to reduce `py-10` to `py-6` and `space-y-6` to `space-y-4`. Also adjust `min-h` to be more flexible or better calculated.

```tsx
<<<<
    <div className="flex-1 min-h-[calc(100vh-80px)] bg-gray-50/30 dark:bg-gray-950/20">
      {/* Main Canvas - Studio Hero */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-8 py-10 lg:px-12"
      >
        <div className="max-w-6xl mx-auto space-y-6">
====
    <div className="flex-1 min-h-full bg-gray-50/30 dark:bg-gray-950/20 flex flex-col justify-center">
      {/* Main Canvas - Studio Hero */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-8 py-6 lg:px-12"
      >
        <div className="max-w-6xl mx-auto space-y-4">
>>>>
```

- [ ] **Step 2: Commit changes**

```bash
git add src/pages/ElectronHomePage.tsx
git commit -m "style: reduce spacing and refine height on Electron home page to avoid scrollbar"
```

### Task 2: Verification

- [ ] **Step 1: Verify visual layout**
Check that the title, subtitle, and all three cards are visible without scrolling. Ensure the layout remains centered if `justify-center` was added.

- [ ] **Step 2: Check for scrollbars**
Ensure no vertical scrollbar appears in the Electron environment (or when simulating the Electron layout in browser).
