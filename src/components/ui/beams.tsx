"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Aceternity-style ambient light beams: thin vertical beams of soft white
 * light drifting slowly behind dark sections. Purely decorative (aria-hidden),
 * transform/opacity-only animation, and silenced for reduced motion.
 */
const BEAMS = [
  { left: "6%", height: "120%", duration: 18, delay: 0, opacity: 0.05 },
  { left: "24%", height: "95%", duration: 24, delay: 3, opacity: 0.07 },
  { left: "46%", height: "115%", duration: 20, delay: 8, opacity: 0.05 },
  { left: "68%", height: "100%", duration: 22, delay: 5, opacity: 0.06 },
  { left: "88%", height: "125%", duration: 19, delay: 1, opacity: 0.04 },
];

export function Beams({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {BEAMS.map((b, i) => (
        <div
          key={i}
          className="beams-beam absolute top-0 w-px"
          style={
            {
              left: b.left,
              height: b.height,
              "--beam-opacity": b.opacity,
              background:
                "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
              filter: "blur(5px)",
              // fill-mode: backwards — during the multi-second delay the beam
              // renders at its dim animated state instead of flashing at full
              // brightness and then "disappearing" when the animation starts.
              animation: `beamDrift ${b.duration}s ease-in-out ${b.delay}s infinite backwards`,
              willChange: "transform, opacity",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
