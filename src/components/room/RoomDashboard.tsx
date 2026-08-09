"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Avatar } from "@/components/room/Avatar";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { Beams } from "@/components/ui/beams";
import { cn } from "@/lib/utils";
import type { MyRoom } from "@/lib/room-config";

const ArrowIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function RoleBadge({ role }: { role: string }) {
  const label = role === "lead" ? "Lead" : role === "co-lead" ? "Co-lead" : "Member";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]",
        role === "lead"
          ? "bg-white text-black"
          : "border border-white/15 text-white/55"
      )}
    >
      {label}
    </span>
  );
}

const dueLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function RoomDashboard({
  rooms,
  me,
  onCreate,
  onJoin,
  onEnter,
  onLogout,
}: {
  rooms: MyRoom[];
  me: { id: string; name: string; color: string; pfp: string | null } | null;
  onCreate: () => void;
  onJoin: () => void;
  onEnter: (slug: string) => void;
  onLogout: () => void;
}) {
  const hasRooms = rooms.length > 0;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-black text-white">
      <NoiseTexture frequency={0.9} octaves={3} slope={0.25} noiseOpacity={0.35} />
      <Beams />

      {/* Header */}
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-black/60 px-4 backdrop-blur-md sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 text-white">
            <circle cx="9" cy="12" r="5.5" />
            <circle cx="15" cy="12" r="5.5" />
          </svg>
          HACKQ<span className="text-white/40">.</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {me && (
            <div className="flex items-center gap-2">
              <Avatar name={me.name} color={me.color} src={me.pfp ?? undefined} size="sm" />
              <span className="hidden max-w-[140px] truncate text-sm text-white/70 sm:block">
                {me.name}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto px-5 py-10 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
          {"// your rooms"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {hasRooms ? "Pick a room" : "No rooms yet"}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">
          {hasRooms
            ? `You're in ${rooms.length} room${rooms.length === 1 ? "" : "s"}. Jump back in, or start something new.`
            : "Create a team and start hacking — or join one with an invite code."}
        </p>

        {hasRooms && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {rooms.map((r, i) => (
              <motion.button
                key={r.teamId}
                type="button"
                onClick={() => onEnter(r.slug)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 320, damping: 28 }}
                className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="truncate text-lg font-semibold tracking-tight">{r.groupName}</h2>
                  <RoleBadge role={r.role} />
                </div>
                <p className="truncate font-mono text-[11px] text-white/40">
                  room/{r.slug || "—"}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs text-white/50">
                    {r.memberCount} member{r.memberCount === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono text-[11px] text-white/40">
                    due {dueLabel(r.deadline)}
                  </span>
                </div>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 transition-colors group-hover:text-white">
                  Enter room
                  <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.button>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-black shadow-[0_10px_24px_-12px_rgba(255,255,255,0.4)] transition hover:bg-neutral-200 active:scale-[0.985]"
          >
            Create a team
          </button>
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white active:scale-[0.985]"
          >
            Join a team
          </button>
        </div>
      </main>
    </div>
  );
}
