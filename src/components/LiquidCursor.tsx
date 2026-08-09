"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

const INTERACTIVE =
  "a, button, [role='button'], input, textarea, select, label, summary, [data-cursor]";

/**
 * Liquid (gooey) cursor — a lime blob that stretches and drips as it moves.
 * Three blobs trail behind the pointer on springs of increasing lag; an SVG
 * goo filter merges them into a single liquid mass that beads back up when
 * the pointer stops. It swells over interactive elements and squishes on click.
 */
export default function LiquidCursor() {
  const reduceMotion = useReducedMotion();
  // Evaluated once; pointer capability doesn't change at runtime.
  const [pointerFine] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
  );
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const mainX = useSpring(x, { stiffness: 420, damping: 32, mass: 0.5 });
  const mainY = useSpring(y, { stiffness: 420, damping: 32, mass: 0.5 });
  const midX = useSpring(x, { stiffness: 260, damping: 30, mass: 0.6 });
  const midY = useSpring(y, { stiffness: 260, damping: 30, mass: 0.6 });
  const tailX = useSpring(x, { stiffness: 150, damping: 26, mass: 0.7 });
  const tailY = useSpring(y, { stiffness: 150, damping: 26, mass: 0.7 });

  // The cursor only activates on fine-pointer devices once we *know* the user
  // has no reduced-motion preference (useReducedMotion is null until motion
  // resolves the media query). Derived from render-time values, so there is no
  // effect-driven setState.
  const enabled = reduceMotion === false && pointerFine;

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-custom-cursor");

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      setHovered(!!t?.closest(INTERACTIVE));
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      style={{ filter: "url(#liquid-goo)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* SVG goo filter — merges the blobs into liquid */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
              result="goo"
            />
          </filter>
        </defs>
      </svg>

      {/* trailing drop */}
      <motion.div
        className="liquid-blob"
        style={{ x: tailX, y: tailY, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: hovered ? 18 : 12, height: hovered ? 18 : 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      />
      {/* mid drop */}
      <motion.div
        className="liquid-blob"
        style={{ x: midX, y: midY, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: hovered ? 26 : 18, height: hovered ? 26 : 18 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      />
      {/* main blob */}
      <motion.div
        className="liquid-blob liquid-blob--main"
        style={{ x: mainX, y: mainY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: hovered ? 52 : 34,
          height: hovered ? 52 : 34,
          scale: pressed ? 0.7 : 1,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
      >
        {/* inner core for depth */}
        <span className="liquid-blob liquid-blob--core" />
      </motion.div>
    </motion.div>
  );
}
