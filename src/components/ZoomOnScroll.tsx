"use client";

import { useEffect, useRef, useState } from "react";

interface ZoomOnScrollProps {
  children: React.ReactNode;
  /** Total height of the pin container; the extra vh beyond 100vh is the zoom scroll distance. */
  pinHeight?: string;
  /** Extra classes merged onto the outer pin container (e.g. page padding). */
  className?: string;
}

export default function ZoomOnScroll({
  children,
  pinHeight = "200vh",
  className = "",
}: ZoomOnScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  // False when the visual already fits the screen (small/short viewports) —
  // then the pin + zoom are skipped entirely so there's no dead locked scroll.
  const [active, setActive] = useState(true);
  const activeRef = useRef(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let raf = 0;

    // Natural, unscaled size of the visual (offset* ignores transforms).
    const measure = (): number => {
      const content = contentRef.current;
      if (!content) return 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const target = (content.firstElementChild ?? content) as HTMLElement;
      const baseW = target.offsetWidth || vw;
      const baseH = target.offsetHeight || vh;
      // Lock at exactly the size of the screen — the scale that fills the
      // viewport (contain). Never over-stretches beyond it.
      return Math.max(1, Math.min(vw / baseW, vh / baseH));
    };

    // Decide once per layout whether the pin + zoom is worth it.
    const decideActive = () => {
      const next = measure() > 1.05;
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
      }
    };

    const update = () => {
      raf = 0;
      const el = containerRef.current;
      const content = contentRef.current;
      if (!el || !content || !activeRef.current) return;

      const vh = window.innerHeight;
      const pinRange = el.offsetHeight - vh;
      if (pinRange <= 0) return;

      // 0 → pinned with no zoom, 1 → zoom complete and ready to move on
      const progress = Math.min(
        1,
        Math.max(0, -el.getBoundingClientRect().top / pinRange)
      );

      if (reduceMotion) return;

      const maxZoom = measure();

      // ease-out: the first scrolls magnify noticeably, then it settles at screen size
      const zoom = 1 + Math.sqrt(progress) * (maxZoom - 1);
      content.style.transform = `scale(${zoom})`;

      if (hintRef.current) {
        hintRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.8));
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      decideActive();
      onScroll();
    };

    decideActive();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black ${className}`}
      style={{ height: active ? pinHeight : "100vh" }}
    >
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        <div
          ref={contentRef}
          className="w-full will-change-transform"
          style={{ transformOrigin: "center center" }}
        >
          {children}
        </div>
        {active && (
          <div
            ref={hintRef}
            className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#9eff00]/80"
          >
            scroll to zoom
          </div>
        )}
      </div>
    </div>
  );
}
