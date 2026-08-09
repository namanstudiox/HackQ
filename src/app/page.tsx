"use client";

import { Fragment, useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import Navbar from "@/components/Navbar";
import LetterReveal from "@/components/LetterReveal";
import LiquidCursor from "@/components/LiquidCursor";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Globe } from "@/components/ui/globe";
import { NoiseTexture } from "@/components/ui/noise-texture";
import ZoomOnScroll from "@/components/ZoomOnScroll";
import ParallaxSection from "@/components/ParallaxSection";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import { scrollToHash } from "@/lib/smooth-scroll";

const HERO_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const marqueeItems = [
  {
    title: "Chat that stays in context",
    desc: "Decisions, links, and late-night breakthroughs live beside the work—not in another tab.",
  },
  {
    title: "Speak it. Stick it.",
    desc: "Turn a rough voice thought into structured idea cards before the spark disappears.",
  },
  {
    title: "Realtime by default",
    desc: "Tasks, ideas, team mood, and presence update for everyone in the room as they happen.",
  },
];

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6l4 2" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8.5 9h7M8.5 12.5h4" />
    <circle cx="17.5" cy="16.5" r="2" fill="currentColor" stroke="none" />
  </svg>
);

const VoiceIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <path d="M17.5 4.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </svg>
);

const BoardIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M9.5 4v16" />
    <circle cx="6.5" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="13" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="6.5" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="17" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const KanbanIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3.5" y="3" width="5" height="18" rx="1" />
    <rect x="10.5" y="3" width="5" height="13" rx="1" />
    <rect x="17.5" y="3" width="5" height="9" rx="1" />
    <path d="M5.5 7h1M5.5 10h1M12.5 7h1M12.5 10h1M19.5 7h1" />
  </svg>
);

const TimerIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9.5V13l2.8 1.8" />
    <path d="M9.5 2.5h5M12 2.5V5" />
  </svg>
);

const MoodIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 10.5a1.5 1.5 0 0 0 3 0" />
    <path d="M12.5 10.5a1.5 1.5 0 0 0 3 0" />
    <path d="M8.5 14.5c1.9 2.4 5.1 2.4 7 0" />
  </svg>
);

const ChatVisual = () => (
  <svg viewBox="0 0 240 110" fill="none" className="w-full h-auto">
    <rect x="20" y="6" width="200" height="98" rx="12" stroke="#d4d4d4" strokeOpacity="0.15" />
    <circle cx="34" cy="18" r="3" fill="#d4d4d4" />
    <circle cx="46" cy="18" r="3" fill="#d4d4d4" fillOpacity="0.4" />
    <circle cx="58" cy="18" r="3" fill="#d4d4d4" fillOpacity="0.4" />
    <circle cx="196" cy="18" r="3.5" fill="#9eff00" className="pulse-dot" />
    <rect x="34" y="34" width="84" height="12" rx="6" fill="#d4d4d4" fillOpacity="0.12" />
    <rect x="34" y="52" width="62" height="12" rx="6" fill="#d4d4d4" fillOpacity="0.12" />
    <rect x="140" y="52" width="70" height="12" rx="6" fill="#9eff00" fillOpacity="0.35" />
    <rect x="34" y="70" width="96" height="12" rx="6" fill="#d4d4d4" fillOpacity="0.12" />
    <rect x="34" y="90" width="150" height="8" rx="4" stroke="#d4d4d4" strokeOpacity="0.2" />
  </svg>
);

const VOICE_BARS = [
  { x: 22, h: 20, o: 0.3, d: 0 },
  { x: 36, h: 44, o: 0.45, d: 0.15 },
  { x: 50, h: 80, o: 0.65, d: 0.3 },
  { x: 64, h: 56, o: 0.5, d: 0.45 },
  { x: 78, h: 86, o: 0.8, d: 0.1 },
  { x: 92, h: 64, o: 0.55, d: 0.55 },
  { x: 106, h: 92, o: 0.9, d: 0.2 },
  { x: 120, h: 70, o: 0.6, d: 0.4 },
  { x: 134, h: 84, o: 0.75, d: 0.05 },
  { x: 148, h: 52, o: 0.5, d: 0.5 },
  { x: 162, h: 68, o: 0.6, d: 0.25 },
  { x: 176, h: 40, o: 0.45, d: 0.35 },
  { x: 190, h: 60, o: 0.55, d: 0.6 },
  { x: 204, h: 34, o: 0.4, d: 0.15 },
] as const;

const VoiceVisual = () => (
  <svg viewBox="0 0 240 110" fill="none" className="w-full h-auto">
    {VOICE_BARS.map((b) => (
      <rect
        key={b.x}
        x={b.x}
        y={100 - b.h}
        width="7"
        height={b.h}
        rx="3.5"
        fill="#d4d4d4"
        fillOpacity={b.o}
        className="eq-bar"
        style={{ animationDelay: `${b.d}s` }}
      />
    ))}
  </svg>
);

const BoardVisual = () => (
  <svg viewBox="0 0 240 110" fill="none" className="w-full h-auto">
    <rect x="18" y="8" width="204" height="94" rx="10" stroke="#d4d4d4" strokeOpacity="0.15" />
    <g
      style={
        {
          "--rot": "-5deg",
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "floaty 6s ease-in-out infinite",
        } as React.CSSProperties
      }
    >
      <rect x="40" y="28" width="60" height="48" rx="4" fill="#d4d4d4" fillOpacity="0.12" />
      <path d="M48 40h44M48 50h30M48 60h38" stroke="#d4d4d4" strokeOpacity="0.45" />
    </g>
    <g
      style={
        {
          "--rot": "3deg",
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "floaty 5.5s ease-in-out infinite 0.6s",
        } as React.CSSProperties
      }
    >
      <rect x="122" y="24" width="56" height="46" rx="4" fill="#d4d4d4" fillOpacity="0.2" />
      <path d="M130 36h40M130 46h24M130 56h32" stroke="#d4d4d4" strokeOpacity="0.6" />
    </g>
    <g
      style={
        {
          "--rot": "-2deg",
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "floaty 7s ease-in-out infinite 1.2s",
        } as React.CSSProperties
      }
    >
      <rect x="160" y="56" width="52" height="38" rx="4" fill="#d4d4d4" fillOpacity="0.15" />
      <path d="M168 68h36M168 78h24" stroke="#d4d4d4" strokeOpacity="0.5" />
    </g>
  </svg>
);

const KanbanVisual = () => (
  <svg viewBox="0 0 240 110" fill="none" className="w-full h-auto">
    <rect x="22" y="10" width="58" height="90" rx="6" stroke="#d4d4d4" strokeOpacity="0.2" />
    <rect x="91" y="10" width="58" height="90" rx="6" stroke="#d4d4d4" strokeOpacity="0.2" />
    <rect x="160" y="10" width="58" height="90" rx="6" stroke="#d4d4d4" strokeOpacity="0.2" />
    <rect x="30" y="20" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.3" />
    <rect x="30" y="36" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.18" />
    <rect x="30" y="52" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.18" />
    <rect x="99" y="20" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.4" />
    <rect x="99" y="36" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.25" />
    <rect x="168" y="20" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.5" />
    <rect x="168" y="36" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.3" />
    <g
      style={
        {
          "--rot": "6deg",
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "floaty 4.5s ease-in-out infinite",
        } as React.CSSProperties
      }
    >
      <rect x="118" y="64" width="44" height="12" rx="4" fill="#9eff00" fillOpacity="0.85" />
    </g>
  </svg>
);

const COUNTDOWN_TOTAL = 48 * 60 * 60;
const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CountdownVisual = () => {
  const [remaining, setRemaining] = useState(COUNTDOWN_TOTAL);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const fraction = remaining / COUNTDOWN_TOTAL;
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

  return (
    <div className="flex w-full items-center justify-center gap-3">
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          stroke="#d4d4d4"
          strokeOpacity="0.15"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          stroke="#d4d4d4"
          strokeWidth="4"
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col items-start">
        <span className="font-mono text-2xl font-medium leading-none tracking-tight text-[#9eff00] tabular-nums">
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
        <span className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          until demo
        </span>
      </div>
    </div>
  );
};

const MoodVisual = () => (
  <svg viewBox="0 0 240 110" fill="none" className="w-full h-auto">
    <path d="M22 88h196" stroke="#d4d4d4" strokeOpacity="0.12" />
    <rect x="30" y="66" width="18" height="22" rx="4" fill="#d4d4d4" fillOpacity="0.25" />
    <rect x="58" y="58" width="18" height="30" rx="4" fill="#d4d4d4" fillOpacity="0.35" />
    <rect x="86" y="46" width="18" height="42" rx="4" fill="#d4d4d4" fillOpacity="0.5" />
    <rect x="114" y="54" width="18" height="34" rx="4" fill="#d4d4d4" fillOpacity="0.45" />
    <rect
      x="142"
      y="38"
      width="18"
      height="50"
      rx="4"
      fill="#9eff00"
      fillOpacity="0.9"
      style={{
        animation: "glowPulse 2.6s ease-in-out infinite",
        filter: "drop-shadow(0 0 8px rgba(158,255,0,0.55))",
      }}
    />
    <rect x="170" y="60" width="18" height="28" rx="4" fill="#d4d4d4" fillOpacity="0.3" />
    <rect x="198" y="50" width="18" height="38" rx="4" fill="#d4d4d4" fillOpacity="0.4" />
  </svg>
);

export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      <ScrollProgress />
      <LiquidCursor />
      <Navbar />

      <main id="top" className="relative bg-black">
        {/* ============ PAGE 1: HERO ============ */}
        <section className="relative h-screen w-full overflow-hidden">
          {/* Background video */}
          <video
            src="/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            className="absolute inset-0 z-0 h-full w-full object-cover"
            style={{
              objectPosition: "50% 18%",
              animation: "ambientShift 24s ease-in-out infinite",
              willChange: "transform, filter",
              transformOrigin: "center center",
              pointerEvents: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          />

          {/* Hero copy */}
          <div
            className="absolute inset-x-0 top-0 z-10 flex flex-col items-start justify-start px-5 pt-28 sm:px-8 md:px-10 lg:px-12"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0) 70%)",
              color: "#d4d4d4",
            }}
          >
            <h1
              aria-label="BUILD AT THE SPEED OF THOUGHT."
              className="max-w-4xl whitespace-nowrap text-[clamp(1.4rem,7vw,5.5rem)] font-normal leading-[1.05] tracking-[-0.02em]"
              style={{ color: "#d4d4d4" }}
            >
              <LetterReveal lines={["BUILD AT THE", "SPEED OF THOUGHT."]} />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0, ease: HERO_EASE }}
              className="mt-6 max-w-xl text-base font-light leading-relaxed sm:text-lg"
              style={{ color: "rgba(212,212,212,0.7)" }}
            >
              The realtime command room for hackathon teams. Capture ideas, coordinate tasks, and
              turn chaotic energy into a shipped demo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.3, ease: HERO_EASE }}
              className="mt-9"
            >
              <a
                href="#system"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHash("#system");
                }}
                className="group relative inline-flex items-center gap-3 pb-1 text-xl font-normal text-[#d4d4d4] transition hover:opacity-80"
              >
                <span>Start Building free</span>
                <span className="text-[#d4d4d4]/60 transition group-hover:text-[#d4d4d4]">
                  <svg
                    width="18"
                    height="10"
                    viewBox="0 0 26 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 7h15" />
                    <path d="M13 1l6 6-6 6" />
                  </svg>
                </span>
                <span className="absolute inset-x-0 bottom-0 h-px bg-[#d4d4d4]/50 transition group-hover:bg-[#d4d4d4]"></span>
              </a>
            </motion.div>
          </div>

          {/* Scroll hint */}
          <div className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex flex-col items-center gap-2.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-[#d4d4d4]/50">
              Scroll
            </span>
            <span
              className="block h-9 w-px bg-gradient-to-b from-[#9eff00]/80 to-transparent"
              style={{ animation: "scrollHint 2.4s ease-in-out infinite" }}
            />
          </div>
        </section>

        {/* Subtle page divider */}
        <div
          className="h-px w-full bg-white/10"
          style={{ boxShadow: "0 0 20px rgba(255,255,255,0.08)" }}
        />

        {/* ============ PAGE 2: NEXT SECTION ============ */}
        <section id="system" className="relative flex w-full flex-col bg-black">
          {/* Marquee */}
          <div
            className="relative w-full border-y border-white/[0.06] py-12"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
            }}
          >
            <div
              className="group relative w-full overflow-hidden"
              style={
                {
                  "--duration": "55s",
                  "--gap": "5.5rem",
                  maskImage:
                    "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
                } as React.CSSProperties
              }
            >
              <div className="flex w-max animate-marquee motion-reduce:animate-none group-hover:[animation-play-state:paused]">
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    className="flex shrink-0 items-center gap-(--gap) pr-(--gap)"
                    aria-hidden={copy === 1}
                  >
                    {marqueeItems.map((item, i) => (
                      <Fragment key={item.title}>
                        <div className="flex max-w-sm flex-col items-start text-left">
                          <div className="flex items-center gap-4">
                            <span
                              className="h-px w-8 shrink-0"
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent, rgba(212,212,212,0.4))",
                              }}
                            />
                            <span className="text-base font-normal uppercase tracking-[0.3em] text-[#d4d4d4] sm:text-lg">
                              {item.title}
                            </span>
                          </div>
                          <span
                            className="mt-5 pl-12 text-sm font-light leading-relaxed"
                            style={{ color: "rgba(212,212,212,0.5)" }}
                          >
                            {item.desc}
                          </span>
                        </div>
                        {i < 2 && (
                          <span
                            className="h-24 w-px shrink-0"
                            style={{
                              background:
                                "linear-gradient(180deg, transparent, rgba(212,212,212,0.12), transparent)",
                            }}
                          />
                        )}
                      </Fragment>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Grid Showcase */}
          <div className="relative flex flex-col items-center px-6 py-10 sm:px-8">
            {/* Soft lime glow behind the grid */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-80 w-[52rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9eff00]/10 blur-3xl" />
            {/* Subtle grain texture behind the grid */}
            <NoiseTexture frequency={0.9} octaves={3} slope={0.25} noiseOpacity={0.5} />
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative z-10 max-w-3xl text-center text-3xl font-normal leading-tight tracking-[-0.02em] text-[#d4d4d4] sm:text-4xl md:text-5xl"
            >
              Less coordinating. <span className="text-[#9eff00]">More creating.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
              className="relative z-10 mt-5 max-w-xl text-center text-base font-light leading-relaxed text-[#d4d4d4]/60 sm:text-lg"
            >
              Built for the 48 hours when every message, decision, and minute matters.
            </motion.p>
            <BentoGrid className="relative z-10 mt-10 w-full">
              {/* Globe hero tile */}
              <BentoCard
                name="Realtime Sync"
                description="Ideas, tasks, and presence — synced for everyone, instantly."
                className="row-span-2 lg:col-span-2"
                fill
                contentClassName="m-5 self-start rounded-xl border border-white/10 bg-black/60 backdrop-blur-md"
                visual={<Globe />}
                icon={<ClockIcon className="h-7 w-7 text-[#9eff00]" />}
              />
              <BentoCard
                name="Real-time Chat"
                description="Team communication with online indicators"
                visual={<ChatVisual />}
                icon={<ChatIcon className="h-8 w-8 text-[#9eff00]" />}
              />
              <BentoCard
                name="Voice-to-Idea AI"
                description="Speak naturally, AI extracts ideas as sticky notes"
                visual={<VoiceVisual />}
                icon={<VoiceIcon className="h-8 w-8 text-[#9eff00]" />}
              />
              <BentoCard
                name="Collaborative Board"
                description="Infinite whiteboard with AI-generated sticky notes"
                visual={<BoardVisual />}
                icon={<BoardIcon className="h-8 w-8 text-[#9eff00]" />}
              />
              <BentoCard
                name="Kanban Tasks"
                description="Drag-and-drop task management"
                visual={<KanbanVisual />}
                icon={<KanbanIcon className="h-8 w-8 text-[#9eff00]" />}
              />
              <BentoCard
                name="Live Countdown"
                description="48-hour timer to keep your team on track"
                visual={<CountdownVisual />}
                icon={<TimerIcon className="h-8 w-8 text-[#9eff00]" />}
              />
              <BentoCard
                name="Team Mood"
                description="Quick check-ins to monitor team morale"
                visual={<MoodVisual />}
                icon={<MoodIcon className="h-8 w-8 text-[#9eff00]" />}
              />
            </BentoGrid>
          </div>
        </section>

        {/* Subtle page divider */}
        <div
          className="h-px w-full bg-white/10"
          style={{ boxShadow: "0 0 20px rgba(255,255,255,0.08)" }}
        />

        {/* ============ PAGE 3: WORKFLOW (zoom on scroll) ============ */}
        <section id="workflow" className="relative w-full bg-black">
          <ZoomOnScroll className="px-6 sm:px-8">
            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 lg:grid-cols-2">
            {/* Left: dark panel — the loop */}
            <div className="flex flex-col gap-10 bg-[#0b0b0b] p-10 sm:p-14">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#9eff00]">
                {"// from zero to demo"}
              </p>
              <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
                A single loop
                <br />
                for the sprint.
              </h2>
              <ol className="mt-2 flex flex-col gap-6">
                {[
                  "Create a room and share the invite",
                  "Drop thoughts into chat or voice",
                  "Turn ideas into assigned tasks",
                  "Watch the board move toward done",
                ].map((step, i) => (
                  <motion.li
                    key={step}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                    className="group flex items-center gap-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#9eff00]/60 font-mono text-xs font-semibold text-[#9eff00] transition-colors duration-200 group-hover:bg-[#9eff00]/10">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-base leading-snug text-white/85">{step}</span>
                  </motion.li>
                ))}
              </ol>
            </div>

            {/* Right: lime panel — the manifesto */}
            <div
              id="manifesto"
              className="flex flex-col justify-between gap-14 bg-[#b4ff39] p-10 sm:p-14"
            >
              <span className="flex items-center gap-1 font-mono text-lg font-semibold leading-none text-black/60">
                &gt;
                <span style={{ animation: "blink 1.1s steps(2, start) infinite" }}>_</span>
              </span>
              <motion.blockquote
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-3xl font-bold leading-[1.12] tracking-tight text-black sm:text-[2.5rem]"
              >
                “The best teams don&apos;t need more tools. They need one place where momentum is
                visible.”
              </motion.blockquote>
              <div className="flex flex-wrap gap-x-7 gap-y-3">
                {["NO SETUP", "REALTIME", "RLS SECURED"].map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold tracking-widest text-black transition-colors duration-200 hover:bg-black/10"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            </div>
          </ZoomOnScroll>
        </section>        {/* ============ PAGE 4: CLOSING CTA ============ */}
        <ParallaxSection
          className="bg-black px-6 py-32 sm:px-8"
          drift={90}
          contentDrift={24}
          background={
            <>
              <div className="absolute left-1/2 top-1/2 h-[28rem] w-[40rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9eff00]/10 blur-3xl" />
              <NoiseTexture frequency={0.9} octaves={3} slope={0.25} noiseOpacity={0.4} />
            </>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="mx-auto flex max-w-3xl flex-col items-center text-center"
          >
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Ready to ship the demo?
            </h2>
            <p className="mt-5 max-w-md text-base font-light leading-relaxed text-[#d4d4d4]/60">
              One room, one loop, 48 hours. Your team&apos;s momentum, visible in realtime.
            </p>
            <a
              href="#system"
              onClick={(e) => {
                e.preventDefault();
                scrollToHash("#system");
              }}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#9eff00] px-8 py-3.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(158,255,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_45px_rgba(158,255,0,0.55)]"
            >
              Start Building free
              <span className="text-base leading-none">→</span>
            </a>
          </motion.div>
        </ParallaxSection>
      </main>
    </MotionConfig>
  );
}
