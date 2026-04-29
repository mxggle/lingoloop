import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Auto-hide hook for floating controls.
 * Listens to mouse/touch/keyboard activity and hides after `delay` ms of inactivity.
 */
export function useAutoHide(delay = 4000) {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, delay);
  }, [delay]);

  const show = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    // Only trigger re-render if state actually changes
    setIsVisible((prev) => {
      if (!prev) return true;
      return prev;
    });
    startHideTimer();
  }, [startHideTimer]);

  useEffect(() => {
    const events: (keyof DocumentEventMap)[] = [
      "mousemove",
      "mousedown",
      "touchstart",
      "keydown",
    ];
    const handleActivity = () => show();

    events.forEach((e) => document.addEventListener(e, handleActivity));
    startHideTimer();

    return () => {
      events.forEach((e) => document.removeEventListener(e, handleActivity));
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [show, startHideTimer]);

  const pause = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  return { isVisible, show, startHideTimer, pause };
}
