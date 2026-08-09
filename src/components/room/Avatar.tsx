"use client";

import { cn } from "@/lib/utils";

const initials = (name: string) => name.slice(0, 2).toUpperCase();

export function Avatar({
  name,
  color,
  src,
  size = "md",
}: {
  name: string;
  color: string;
  /** Optional profile picture — overrides the colored initials. */
  src?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      title={name}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-black font-bold text-black",
        size === "md" ? "h-8 w-8 text-[11px]" : "h-7 w-7 text-[10px]"
      )}
      style={{ background: color }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
