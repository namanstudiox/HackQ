"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface ParallaxSectionProps {
  children: ReactNode;
  /** Layer that drifts slower than the scroll (glows, textures, art…). */
  background?: ReactNode;
  className?: string;
  /** Peak vertical drift of the background layer, in px. */
  drift?: number;
  /** Optional smaller drift applied to the content for depth. */
  contentDrift?: number;
}

export default function ParallaxSection({
  children,
  background,
  className,
  drift = 100,
  contentDrift = 0,
}: ParallaxSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Background glides upward as the section crosses the viewport (slower than scroll).
  const bgY = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const contentY = useTransform(scrollYProgress, [0, 1], [contentDrift, -contentDrift]);
  // Oversize the layer just past the max drift so its edges never peek through.
  const oversize = drift + 110;

  return (
    <section
      ref={ref}
      className={cn("relative w-full overflow-hidden", className)}
    >
      {background && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0"
          style={{ top: -oversize, bottom: -oversize, y: reduceMotion ? 0 : bgY }}
        >
          {background}
        </motion.div>
      )}
      <motion.div
        className="relative z-10"
        style={{ y: reduceMotion ? 0 : contentY }}
      >
        {children}
      </motion.div>
    </section>
  );
}
