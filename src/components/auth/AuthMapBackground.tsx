"use client";

import { memo, useEffect, useState } from "react";
import { DottedMap } from "@/components/ui/dotted-map";

const MAP_MARKERS = [
  { lat: 37.7749, lng: -122.4194, size: 3.6, pulse: true }, // San Francisco
  { lat: 51.5074, lng: -0.1278, size: 3.6, pulse: true }, // London
  { lat: 35.6762, lng: 139.6503, size: 3.6, pulse: true }, // Tokyo
];

/**
 * Full-viewport dotted map on a slightly-light dark surface. "meet" keeps the
 * whole world visible without scrolling. Rendered client-side only (after
 * mount, with a fade-in) so the ~3.2k dots don't bloat SSR HTML or hydrate
 * on load. Purely decorative.
 */
function AuthMapBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer the ~3.2k-dot map render until the browser is idle so the form
    // paints first. rIC is capped at 1.2s so the map always appears even if
    // the main thread never idles; falls back to a timer where unsupported.
    const hasRIC = "requestIdleCallback" in window;
    const id = hasRIC
      ? window.requestIdleCallback(() => setMounted(true), { timeout: 1200 })
      : window.setTimeout(() => setMounted(true), 400);
    return () => {
      if (hasRIC) cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#151518]">
      {mounted && (
        /* Static map — no drift animation, so nothing animates on the main thread. */
        <div
          className="absolute inset-0"
          style={{ animation: "mapAppear 0.7s ease-out both" }}
        >
          <DottedMap
            width={1600}
            height={900}
            mapSamples={9000}
            dotColor="rgba(214,220,228,0.5)"
            markerColor="#a6c83a"
            dotRadius={1.6}
            markers={MAP_MARKERS}
            preserveAspectRatio="xMidYMid meet"
            className="dotted-map"
          />
        </div>
      )}
      {/* Faint top light for depth */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,255,255,0.04),transparent_70%)]" />
    </div>
  );
}

// Memoized: the form re-renders on every keystroke, and this must NOT —
// diffing ~3.2k SVG circles per character is exactly what made inputs lag.
export default memo(AuthMapBackground);
