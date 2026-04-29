import { useEffect } from "react";

let lockCount = 0;
const originalStyles = new Map<Element, string>();

function isScrollable(el: Element): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  return (
    (overflowY === "auto" || overflowY === "scroll") &&
    el.scrollHeight > el.clientHeight
  );
}

function isInsideOverlay(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (
      current.getAttribute("role") === "dialog" ||
      current.getAttribute("data-radix-popper-content-wrapper") !== null
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function getScrollableElements(): Element[] {
  const candidates = document.querySelectorAll(
    'main, aside, section, article, nav, [class*="overflow"]'
  );
  const scrollables: Element[] = [];
  candidates.forEach((el) => {
    if (isScrollable(el) && !isInsideOverlay(el)) {
      scrollables.push(el);
    }
  });
  return scrollables;
}

function lockScroll() {
  if (lockCount === 0) {
    const elements = getScrollableElements();
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      originalStyles.set(el, htmlEl.style.overflowY);
      htmlEl.style.overflowY = "hidden";
    });
  }
  lockCount++;
}

function unlockScroll() {
  lockCount--;
  if (lockCount <= 0) {
    lockCount = 0;
    originalStyles.forEach((original, el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflowY = original;
    });
    originalStyles.clear();
  }
}

export function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [enabled]);
}

export function ScrollLock() {
  useScrollLock(true);
  return null;
}
