"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HoverBorderGradientProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Aceternity-style hover-border button: a dark pill with a hairline border
 * that lights up into a rotating white gradient ring on hover. Pass
 * className="w-full" for full-width CTAs.
 */
export function HoverBorderGradient({
  children,
  className,
  ...props
}: HoverBorderGradientProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "group/btn relative inline-flex items-center justify-center overflow-hidden rounded-full p-px transition-transform duration-200 active:scale-[0.98]",
        className
      )}
    >
      {/* resting hairline */}
      <span aria-hidden className="absolute inset-0 rounded-full bg-white/15" />
      {/* animated gradient border — orbits the ring on hover */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.85) 40deg, transparent 110deg)",
          animation: "hoverBorderSpin 3s linear infinite",
        }}
      />
      <span className="relative flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-200 group-hover/btn:bg-neutral-900">
        {children}
      </span>
    </button>
  );
}
