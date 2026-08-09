import type Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/** Access the active Lenis instance (undefined on server / when disabled). */
export function getLenis(): Lenis | undefined {
  return typeof window === "undefined" ? undefined : window.__lenis;
}

/**
 * Smooth-scroll to an in-page anchor. Uses Lenis when active (so anchor
 * scrolling matches the smooth-scroll feel), otherwise falls back to native
 * smooth scrollIntoView.
 */
export function scrollToHash(href: string) {
  if (!href.startsWith("#")) return;
  const target = document.querySelector<HTMLElement>(href);
  if (!target) return;

  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(target, { offset: -80, duration: 1.2 });
  } else {
    target.scrollIntoView({
      behavior: "smooth",
      block: href === "#manifesto" ? "center" : "start",
    });
  }
}
