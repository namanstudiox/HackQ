"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { signOut, toLocalInput, PATH_LABELS, type RoomPath } from "@/lib/room-config";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { Beams } from "@/components/ui/beams";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { cn } from "@/lib/utils";

const QUICK_HOURS = [24, 36, 48, 72];

const fromNowLocal = (hours: number) =>
  toLocalInput(new Date(Date.now() + hours * 3600 * 1000));

const inputClass =
  "h-11 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3.5 text-[15px] text-white caret-white outline-none transition-all duration-200 placeholder:text-neutral-500 hover:bg-white/[0.07] hover:border-white/30 focus:border-white/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-white/10";

export default function RoomSetup({
  path,
  onDone,
}: {
  path: RoomPath;
  onDone: (input: {
    groupName: string;
    eventName: string;
    deadline: number;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();

  // Leave the room for a fresh sign-in. Navigation always wins — sign-out is
  // fire-and-forget so a flaky Supabase call can never dead-button the link.
  const backToSignIn = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    void signOut().catch(() => {});
    router.push("/login");
  };

  const [groupName, setGroupName] = useState("");
  const [eventName, setEventName] = useState("");
  const [deadline, setDeadline] = useState(() => fromNowLocal(QUICK_HOURS[2]));
  const [quickSel, setQuickSel] = useState<number | null>(QUICK_HOURS[2]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Give your group a name first.");
      return;
    }
    const deadlineMs = new Date(deadline).getTime();
    if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.now()) {
      setError("Pick a submission time in the future.");
      return;
    }
    setBusy(true);
    const res = await onDone({
      groupName: groupName.trim(),
      eventName: eventName.trim() || "HackQ Sprint",
      deadline: deadlineMs,
    });
    if (!res.ok) {
      setBusy(false);
      setError(res.error ?? "Couldn't set up the room — try again.");
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-black px-5 py-12 text-white">
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
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 sm:p-9">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
              {"// set up your sprint"}
            </p>
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70">
              {PATH_LABELS[path]}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Before you start</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Tell us about the group — we&apos;ll set up the room and the clock.
          </p>

          <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="group-name" className="text-[13px] font-medium text-neutral-300">
                Group name
              </label>
              <input
                id="group-name"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Neon Sprint"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-name" className="text-[13px] font-medium text-neutral-300">
                Event name <span className="text-neutral-500">(optional)</span>
              </label>
              <input
                id="event-name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="HackQ Sprint 2026"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="deadline" className="text-[13px] font-medium text-neutral-300">
                Submission deadline
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setDeadline(fromNowLocal(h));
                      setQuickSel(h);
                    }}
                    aria-pressed={quickSel === h}
                    className={cn(
                      "rounded-lg border py-1.5 font-mono text-[11px] transition",
                      quickSel === h
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/30 hover:text-white"
                    )}
                  >
                    +{h}h
                  </button>
                ))}
              </div>
              <input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  setQuickSel(null);
                }}
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-400">
                {error}
              </p>
            )}

            <HoverBorderGradient type="submit" className="mt-1 w-full">
              {busy ? "Setting up…" : "Start the sprint"}
            </HoverBorderGradient>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs leading-relaxed text-white/40">
              Once the room is live you&apos;ll get an invite code — teammates join with it, and
              you approve them before they get in.
            </p>
            <Link
              href="/login"
              onClick={backToSignIn}
              className="mt-4 inline-block text-xs text-white/40 transition hover:text-white"
            >
              ← back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
