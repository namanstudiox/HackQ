"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Beams } from "@/components/ui/beams";
import { Avatar } from "@/components/room/Avatar";
import {
  loadMoods,
  setMood,
  subscribeToRoom,
  MOODS,
  type MoodId,
  type MoodRecord,
  type RoomConfig,
  type TeamMember,
} from "@/lib/room-config";
import { cn } from "@/lib/utils";

/** Line-art glyph per mood — same stroke language as the rest of the room. */
const MoodGlyph = ({ id, className }: { id: MoodId; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {id === "fired" && <path d="M13 2L4 14h6l-1 8 9-12h-6z" />}
    {id === "locked" && (
      <>
        <circle cx="12" cy="12" r="7" />
        <path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </>
    )}
    {id === "okay" && (
      <>
        <path d="M4 12h16" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      </>
    )}
    {id === "drained" && (
      <>
        <rect x="3" y="7.5" width="15" height="9" rx="2" />
        <path d="M20.5 10v4" />
        <rect x="5" y="9.5" width="6" height="5" rx="1" fill="currentColor" stroke="none" />
      </>
    )}
    {id === "lost" && (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2.3 5-5 2.3 2.3-5z" fill="currentColor" stroke="none" />
      </>
    )}
  </svg>
);

function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MoodView({
  config,
  me,
}: {
  config: RoomConfig;
  /** The member object that represents *me* in this room. */
  me: TeamMember;
}) {
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  // Stable "now" (purity-safe) bumped every 30s so relative times stay fresh.
  const [now, setNow] = useState(() => Date.now());

  // Server-hosted sync: load once, then live-update via Supabase realtime
  // (debounced so bursts coalesce into a single refetch).
  useEffect(() => {
    let alive = true;
    let debounce: number | null = null;
    const refresh = () => {
      void loadMoods(config.teamId).then((next) => {
        if (alive) setRecords(next);
      });
    };
    refresh();
    const onEvent = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (alive) refresh();
      }, 250);
    };
    const unsubscribe = subscribeToRoom(config.teamId, "moods", onEvent);
    return () => {
      alive = false;
      unsubscribe();
      if (debounce) window.clearTimeout(debounce);
    };
  }, [config.teamId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const myRecord = records.find((r) => r.memberId === me.id);

  // Keep the note input in sync if my check-in changed elsewhere (another tab).
  const [prevNote, setPrevNote] = useState<string | undefined>(undefined);
  if (prevNote !== myRecord?.note) {
    setPrevNote(myRecord?.note);
    setNoteDraft(myRecord?.note ?? "");
  }

  /** Rows: checked-in members first (most recent first), then the rest. */
  const rows = config.members
    .map((member) => ({ member, rec: records.find((r) => r.memberId === member.id) }))
    .sort((a, b) => {
      if (a.rec && b.rec) return b.rec.at - a.rec.at;
      if (a.rec) return -1;
      if (b.rec) return 1;
      return 0;
    });

  const checkedIn = rows.filter((r) => r.rec).length;
  const counts = MOODS.map((m) => ({ id: m.id, n: rows.filter((r) => r.rec?.mood === m.id).length }));
  const top = counts.reduce((best, c) => (c.n > best.n ? c : best), { id: "" as string, n: 0 });
  const vibe = top.n > 0 ? `The room is mostly ${MOODS.find((m) => m.id === top.id)?.label}` : null;

  /** Clicking a mood checks in instantly (keeps any saved note). Re-tapping
   * the same mood refreshes the check-in (fresh timestamp). */
  const chooseMood = async (id: MoodId) => {
    const rec = await setMood(config.teamId, {
      mood: id,
      note: myRecord?.note,
    });
    if (rec) {
      setRecords((prev) => [
        ...prev.filter((r) => r.memberId !== me.id),
        { ...rec, memberId: me.id },
      ]);
    }
  };

  const saveNote = async () => {
    if (!myRecord) return;
    const note = noteDraft.trim();
    const rec = await setMood(config.teamId, {
      mood: myRecord.mood,
      note: note || undefined,
    });
    if (rec) {
      setRecords((prev) => [
        ...prev.filter((r) => r.memberId !== me.id),
        { ...rec, memberId: me.id },
      ]);
    }
    setNoteDraft("");
  };

  return (
    <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
      <Beams />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-80 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl [mask-image:radial-gradient(70%_70%_at_50%_25%,black,transparent_75%)]"
      />

      {/* Header */}
      <div className="relative z-10 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// mood"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Mood check-in
          </h1>
          <p className="mt-1 text-sm text-white/50">Quick check-ins, visible to the whole room.</p>
        </div>
        <span className="mb-1 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
          live
        </span>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pb-2">
        {/* Room pulse */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                room pulse
              </p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight text-white">
                {vibe ?? "Waiting for the first check-in"}
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                {checkedIn} of {config.members.length} in the room have checked in
              </p>
            </div>
          </div>
          <div className="mt-4 flex h-2 w-full gap-1 overflow-hidden rounded-full">
            {MOODS.map((m) => {
              const n = counts.find((c) => c.id === m.id)?.n ?? 0;
              if (!n) return null;
              return (
                <div
                  key={m.id}
                  aria-label={`${m.label} · ${n}`}
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(n / Math.max(1, checkedIn)) * 100}%`, background: m.color }}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Your check-in */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              your check-in
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {MOODS.map((m) => {
                const active = myRecord?.mood === m.id;
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    onClick={() => chooseMood(m.id)}
                    aria-pressed={active}
                    whileTap={{ scale: 0.94 }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition-colors",
                      active
                        ? "border-white/40 bg-white/[0.08]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
                    )}
                  >
                    <span style={{ color: active ? m.color : "rgba(255,255,255,0.55)" }}>
                      <MoodGlyph id={m.id} className="h-5 w-5" />
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-medium leading-tight",
                        active ? "text-white" : "text-white/50"
                      )}
                    >
                      {m.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            {myRecord ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: MOODS.find((m) => m.id === myRecord.mood)?.color }}
                />
                {MOODS.find((m) => m.id === myRecord.mood)?.label} · updated{" "}
                {timeAgo(myRecord.at, now)}
              </p>
            ) : (
              <p className="mt-3 text-xs text-white/40">
                Pick a mood to check in — the room sees it instantly.
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveNote();
                  }
                }}
                maxLength={120}
                disabled={!myRecord}
                placeholder={myRecord?.note ? "Update your note…" : "Optional note — how's it going?"}
                aria-label="Mood note"
                className="h-9 w-full flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[13px] text-white caret-white outline-none transition placeholder:text-neutral-500 hover:border-white/30 focus:border-white/50 focus:ring-4 focus:ring-white/10 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={saveNote}
                disabled={!myRecord || !noteDraft.trim()}
                className={cn(
                  "h-9 shrink-0 rounded-lg px-3 text-[12px] font-bold transition active:scale-95",
                  myRecord && noteDraft.trim()
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/30"
                )}
              >
                Save
              </button>
            </div>
          </div>

          {/* The room */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              the room
            </p>
            <div className="mt-3 flex flex-col">
              {rows.map(({ member, rec }) => {
                const mood = rec ? MOODS.find((m) => m.id === rec.mood) : undefined;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]"
                  >
                    <Avatar name={member.name} color={member.color} src={member.pfp} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium text-white/85">
                          {member.name}
                          {member.id === me.id && (
                            <span className="ml-1 text-[10px] text-white/40">(you)</span>
                          )}
                        </span>
                        {mood && rec ? (
                          <span
                            className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]"
                            style={{ borderColor: `${mood.color}55`, color: mood.color }}
                          >
                            <span
                              className="h-1 w-1 rounded-full"
                              style={{ background: mood.color }}
                            />
                            {mood.label}
                          </span>
                        ) : null}
                      </div>
                      {rec?.note ? (
                        <p className="mt-0.5 truncate text-[11px] text-white/50">{rec.note}</p>
                      ) : !rec ? (
                        <p className="mt-0.5 text-[11px] text-white/30">
                          hasn&apos;t checked in yet
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-mono text-[9px] text-white/30">
                      {rec ? timeAgo(rec.at, now) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
