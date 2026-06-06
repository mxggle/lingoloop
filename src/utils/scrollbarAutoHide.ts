/**
 * Floating / auto-hide scrollbars.
 *
 * The scrollbar thumb is transparent by default (see index.css) and only
 * becomes faintly visible while the element is actively scrolling. We toggle an
 * `is-scrolling` class on whichever element fires a scroll event, then remove it
 * shortly after scrolling stops. Scroll events don't bubble, so we listen in the
 * capture phase to catch every scroll container across all pages.
 */

const HIDE_DELAY = 800

let initialized = false

export function initScrollbarAutoHide(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  const timers = new WeakMap<Element, number>()

  const handleScroll = (event: Event): void => {
    const target = event.target
    const el =
      target === document || target === document.documentElement || target === document.body
        ? document.documentElement
        : target instanceof Element
          ? target
          : null

    if (!el) return

    el.classList.add('is-scrolling')

    const previous = timers.get(el)
    if (previous !== undefined) window.clearTimeout(previous)

    const id = window.setTimeout(() => {
      el.classList.remove('is-scrolling')
      timers.delete(el)
    }, HIDE_DELAY)

    timers.set(el, id)
  }

  window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
}
