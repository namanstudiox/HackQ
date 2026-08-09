"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import AuthMapBackground from "@/components/auth/AuthMapBackground";
import AuthArtwork from "@/components/auth/AuthArtwork";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Move keyboard focus to the heading on mount (e.g. success states). */
  focusTitle?: boolean;
}

/**
 * Auth layout: the full dotted map fitted to the viewport, with a floating
 * glossy-black round card on top — form panel on the left, dark fluid-mesh
 * artwork on the right. Geist for type; matte green as the accent.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  focusTitle = false,
}: AuthShellProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-dvh w-full overflow-hidden bg-[#151518]">
        <AuthMapBackground />

        <main className="relative z-10 flex h-full w-full items-center justify-center overflow-y-auto px-5 py-8">
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 24, mass: 0.9 }}
            className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#27272c_0%,#131316_55%,#0a0a0c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_50px_120px_-32px_rgba(0,0,0,0.9)]"
          >
            {/* Gloss streak */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.07)_0%,transparent_32%)]"
            />

            <div className="grid md:grid-cols-[1.15fr_1fr]">
              {/* Left: form panel */}
              <div className="flex flex-col p-7 sm:p-12">
                <Link
                  href="/"
                  className="group flex w-fit items-center gap-2.5 text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-12"
                  >
                    <circle cx="9" cy="12" r="5.5" />
                    <circle cx="15" cy="12" r="5.5" />
                  </svg>
                  <span className="text-[22px] font-semibold tracking-tight">
                    HACKQ<span className="text-matte">.</span>
                  </span>
                </Link>

                <h1
                  ref={titleRef}
                  tabIndex={focusTitle ? -1 : undefined}
                  className="mt-10 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-white focus:outline-none sm:text-[2.4rem]"
                >
                  {title}
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-400">
                  {subtitle}
                </p>

                <div className="mt-9 flex flex-1 flex-col">{children}</div>

                {footer && (
                  <div className="mt-8 border-t border-white/10 pt-6 text-sm leading-relaxed text-neutral-400">
                    {footer}
                  </div>
                )}
              </div>

              {/* Right: artwork panel */}
              <div className="hidden md:block">
                <AuthArtwork />
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}
