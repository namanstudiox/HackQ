"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RoomBentoCardProps {
  name: string;
  description: string;
  icon: ReactNode;
  visual?: ReactNode;
  /** Small mono footer hint (e.g. "next up →"). */
  footer?: ReactNode;
  className?: string;
  /** When provided the card renders as a button. */
  onClick?: () => void;
}

/**
 * Aceternity-style bento card, neutral: a soft white gradient surface, a
 * sweeping top-edge beam and radial glow that light up on hover, and a gentle
 * lift. Color is reserved for content (avatars, presence) — not the chrome.
 */
export function RoomBentoCard({
  name,
  description,
  icon,
  visual,
  footer,
  className,
  onClick,
}: RoomBentoCardProps) {
  const body = (
    <>
      {/* top-edge glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(255,255,255,0.09), transparent 70%)",
        }}
      />
      {/* sweeping highlight along the top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <div
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent"
          style={{ animation: "beamSweep 2.6s ease-in-out infinite" }}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-1.5 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-colors duration-300 group-hover:bg-white/10">
          {icon}
        </div>
        <h3 className="mt-1 text-base font-semibold tracking-tight text-white">{name}</h3>
        <p className="text-sm leading-relaxed text-neutral-400">{description}</p>
      </div>

      {visual && (
        <div className="relative mt-auto flex min-h-[6.5rem] flex-1 items-center justify-center overflow-hidden px-4 pb-4 transition-transform duration-500 group-hover:scale-[1.02]">
          {visual}
        </div>
      )}

      {footer && <div className="relative z-10 px-5 pb-4">{footer}</div>}
    </>
  );

  const cardClass = cn(
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_24px_60px_-24px_rgba(255,255,255,0.15)]",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          cardClass,
          "w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        )}
      >
        {body}
      </button>
    );
  }

  return <div className={cardClass}>{body}</div>;
}
