"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { Beams } from "@/components/ui/beams";
import { type RoomPath } from "@/lib/room-config";

interface PathOption {
  path: RoomPath;
  title: string;
  subtitle: string;
  preview: ReactNode;
}

/* ---- mini mockup previews (pure CSS, no images) ---- */

const Bar = ({ w, o = "bg-white/15" }: { w: string; o?: string }) => (
  <div className={`h-1.5 ${w} rounded-full ${o}`} />
);

/** Preview: a mini version of the room-setup form. */
const CreatePreview = () => (
  <div className="flex h-44 flex-col gap-2.5 rounded-t-2xl border-b border-white/10 bg-white/[0.03] p-4 text-left">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-3.5 w-3.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <Bar w="w-16" o="bg-white/25" />
    </div>
    <Bar w="w-28" o="bg-white/10" />
    <div className="mt-1 flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.05] px-2.5">
      <Bar w="w-3/5" o="bg-white/12" />
    </div>
    <div className="flex gap-1.5">
      {["w-10", "w-10", "w-10", "w-10"].map((w, i) => (
        <span key={i} className={`h-6 rounded-md border border-white/10 bg-white/[0.05] ${w}`} />
      ))}
    </div>
    <div className="mt-auto flex h-7 items-center justify-center rounded-lg bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.2)]">
      <Bar w="w-14" o="bg-black/60" />
    </div>
  </div>
);

/** Preview: an invite-code entry with a caret and join arrow. */
const JoinPreview = () => (
  <div className="flex h-44 flex-col gap-2.5 rounded-t-2xl border-b border-white/10 bg-white/[0.03] p-4 text-left">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M15 3l6 6-9 9H6v-6z" />
          <path d="M9 21h6" />
        </svg>
      </span>
      <Bar w="w-16" o="bg-white/25" />
    </div>
    <div className="mt-1 flex h-7 items-center rounded-lg border border-white/10 bg-white/[0.05] px-2.5">
      <Bar w="w-1/3" o="bg-white/12" />
    </div>
    <Bar w="w-32" o="bg-white/10" />
    <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-black/40 px-3 font-mono text-[13px] text-white">
      HQ-<span className="tracking-[0.3em]">________</span>
      <span className="ml-auto h-4 w-px animate-pulse bg-white" />
    </div>
    <div className="mt-auto flex h-7 items-center justify-center gap-1.5 rounded-lg bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.2)]">
      <Bar w="w-12" o="bg-black/60" />
      <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </div>
  </div>
);

const OPTIONS: PathOption[] = [
  {
    path: "create",
    title: "Create a Team",
    subtitle: "Start your own room — name the group, set the deadline, start the clock.",
    preview: <CreatePreview />,
  },
  {
    path: "join",
    title: "Join a Team",
    subtitle: "Got an invite code? Land straight in your teammates' room.",
    preview: <JoinPreview />,
  },
];

export default function PathPicker({ onPick }: { onPick: (path: RoomPath) => void }) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black px-5 py-12 text-white">
      <NoiseTexture frequency={0.9} octaves={3} slope={0.25} noiseOpacity={0.35} />
      <Beams />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-3xl"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
          {"// first time here"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Nothing here yet — <span className="text-white">create or join a team</span> to
          begin.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
          You haven&apos;t set up a room yet. Create one for your group, or join a team with an
          invite code.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((opt, i) => (
            <motion.button
              key={opt.path}
              type="button"
              onClick={() => onPick(opt.path)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-[border-color,box-shadow] duration-300 hover:border-white/30 hover:shadow-[0_24px_60px_-24px_rgba(255,255,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {opt.preview}
              <div className="p-5">
                <h2 className="text-[15px] font-semibold tracking-tight">{opt.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/40">
                  {opt.subtitle}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 transition group-hover:text-white/70">
                  choose →
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        <Link
          href="/login"
          className="mt-8 inline-block text-xs text-white/40 transition hover:text-white"
        >
          ← back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
