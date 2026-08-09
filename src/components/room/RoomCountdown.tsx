"use client";

import { Fragment, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Split-flap style cell — the digit flips in from above, out below. */
function FlipCell({ digit }: { digit: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-9 w-7 overflow-hidden rounded-md border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_-16px_rgba(0,0,0,0.9)]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={reduce ? false : { y: "-105%", opacity: 0, rotateX: 70 }}
          animate={{ y: "0%", opacity: 1, rotateX: 0 }}
          exit={reduce ? undefined : { y: "105%", opacity: 0, rotateX: -70 }}
          transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
          className="absolute inset-0 flex items-center justify-center font-mono text-lg font-medium tabular-nums text-white"
          style={{ transformPerspective: 240 }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
      {/* The classic split-flap seam — hides the flip midpoint. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/60"
      />
    </div>
  );
}

/** Per-character roll for the compact topbar chip. */
function RollTime({ text }: { text: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex tabular-nums">
      {text.split("").map((ch, i) =>
        ch === ":" ? (
          <span key={i} className="text-white/40">
            {ch}
          </span>
        ) : reduce ? (
          <span key={i}>{ch}</span>
        ) : (
          <span key={i} className="relative inline-block overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={ch}
                initial={{ y: "0.75em", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-0.75em", opacity: 0 }}
                transition={{ type: "spring", stiffness: 480, damping: 32 }}
                className="inline-block"
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        )
      )}
    </span>
  );
}

const cellVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
};

export default function RoomCountdown({
  endTime,
  totalMs,
  size = "sm",
  className,
}: {
  /** Submission deadline as epoch ms — set during room setup. */
  endTime: number;
  /** Full window (deadline − startedAt) — enables the progress ring on lg. */
  totalMs?: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  // 0 until mounted — SSR and first paint both render dashes (no Date.now() mismatch).
  const [now, setNow] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    // First tick via rAF, then every second.
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);

  const remaining = Math.max(0, endTime - now);
  const done = now > 0 && remaining <= 0;
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const hh = pad(remaining / 3600000);
  const mm = pad((remaining % 3600000) / 60000);
  const ss = pad((remaining % 60000) / 1000);
  const display = now ? `${hh}:${mm}:${ss}` : "--:--:--";

  if (size === "sm") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5",
          className
        )}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
        <span className="font-mono text-xs text-white">
          {now ? <RollTime text={display} /> : display}
        </span>
      </div>
    );
  }

  const fraction =
    totalMs && totalMs > 0 ? Math.min(1, Math.max(0, remaining / totalMs)) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

  // A per-second drain is invisible, so the ring adds a seconds hand + arc bead
  // for honest visible motion. Angles start at 12 o'clock (-rotate-90).
  const seconds = now ? Math.floor((remaining % 60000) / 1000) : 0;
  const handAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2;
  const handX = 32 + RING_RADIUS * Math.cos(handAngle);
  const handY = 32 + RING_RADIUS * Math.sin(handAngle);
  const tipAngle = fraction * Math.PI * 2 - Math.PI / 2;
  const tipX = 32 + RING_RADIUS * Math.cos(tipAngle);
  const tipY = 32 + RING_RADIUS * Math.sin(tipAngle);
  // Sweep cx/cy with a linear transition so both markers glide, not jump.
  const markerTransition = { transition: "cx 1s linear, cy 1s linear" } as const;

  const groups = [
    { value: hh, label: "hrs" },
    { value: mm, label: "min" },
    { value: ss, label: "sec" },
  ];

  return (
    // Container queries: the inner flex flips to a row at ~32rem (control-centre
    // card) and stacks in the narrow overview card. Queries match descendants,
    // so the responsive classes live on the inner div.
    <div className={cn("@container w-full", className)}>
      <div className="flex w-full flex-col items-center gap-4 @lg:flex-row @lg:gap-6">
      {/* Progress ring — drains 1s-linear so it never jumps a second. The
          seconds hand + tip bead make the progress visibly move. */}
      <svg viewBox="0 0 64 64" className="h-20 w-20 shrink-0 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          stroke="#d4d4d4"
          strokeOpacity="0.15"
          strokeWidth="5"
          fill="none"
        />
        {/* drained portion */}
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          stroke="#26262b"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE - (1 - fraction) * RING_CIRCUMFERENCE}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        {/* remaining arc */}
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          stroke="#ffffff"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 1s linear",
            filter: "drop-shadow(0 0 6px rgba(255,255,255,0.25))",
          }}
        />
        {/* glowing bead at the tip of the remaining arc */}
        {now > 0 && (
          <circle
            cx={tipX}
            cy={tipY}
            r="2.6"
            fill="#ffffff"
            style={{
              ...markerTransition,
              filter: "drop-shadow(0 0 4px rgba(255,255,255,0.9))",
            }}
          />
        )}
        {/* seconds hand — sweeps the ring once a minute (reduced-motion: off) */}
        {now > 0 && !reduce && (
          <g>
            <circle cx={handX} cy={handY} r="2" fill="#d4d4d4" style={markerTransition} />
            <circle cx={handX} cy={handY} r="4" fill="none" stroke="#d4d4d4" strokeOpacity="0.35" style={markerTransition} />
          </g>
        )}
      </svg>

      <div className="flex flex-col items-center gap-3 @lg:items-start">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="flex items-start"
        >
          {groups.map((g, gi) => (
            <Fragment key={g.label}>
              {gi > 0 && (
                <span aria-hidden className="mt-2.5 px-1 font-mono text-lg text-white/30">
                  :
                </span>
              )}
              <motion.div variants={cellVariants} className="flex flex-col items-center">
                <div className="flex gap-1">
                  <FlipCell digit={g.value[0]} />
                  <FlipCell digit={g.value[1]} />
                </div>
                <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                  {g.label}
                </span>
              </motion.div>
            </Fragment>
          ))}
        </motion.div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          {done ? "submission passed" : "until submit"}
        </p>
      </div>
      </div>
    </div>
  );
}
