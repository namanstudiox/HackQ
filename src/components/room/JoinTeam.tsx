"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { Beams } from "@/components/ui/beams";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

const inputClass =
  "h-12 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3.5 text-[15px] text-white caret-white outline-none transition-all duration-200 placeholder:text-neutral-500 hover:bg-white/[0.07] hover:border-white/30 focus:border-white/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-white/10";

/**
 * Join screen: asks for the team's invite code. Submitting creates a join
 * request that the team lead must approve. Your identity (name, avatar) comes
 * from your account — the lead sees your profile when approving.
 */
export default function JoinTeam({
  initialCode = "",
  onRequest,
  onBack,
}: {
  initialCode?: string;
  onRequest: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onBack: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Accept either a bare invite code ("HQ-4F2AK9XM") or a full invite link
   * ("https://app/room?code=HQ-4F2AK9XM" — what the copy button produces).
   * URLs get the code extracted, then everything goes through the same
   * sanitizer (uppercase, keep only code chars, cap at 11).
   */
  const clean = (v: string) => {
    const urlCode = /[?&]code=([A-Za-z0-9-]+)/.exec(v);
    const base = urlCode ? urlCode[1] : v;
    return base.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 11);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError("Enter the full invite code — it looks like HQ-4F2AK9XM.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onRequest(code);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "No room found with that code.");
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
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// join a team"}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Join your teammates</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Enter the invite code from whoever created the room — the team lead will clear you in.
          </p>

          <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-code" className="text-[13px] font-medium text-neutral-300">
                Invite code
              </label>
              <input
                id="invite-code"
                value={code}
                onChange={(e) => {
                  setCode(clean(e.target.value).slice(0, 11));
                  if (error) setError(null);
                }}
                placeholder="HQ-4F2AK9XM"
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono text-lg tracking-[0.12em] text-white placeholder:text-neutral-600`}
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-400">
                {error}
              </p>
            )}

            <HoverBorderGradient type="submit" className="mt-1 w-full">
              {busy ? "Requesting…" : "Request to join"}
            </HoverBorderGradient>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs leading-relaxed text-white/40">
              No code yet?{" "}
              <button
                type="button"
                onClick={onBack}
                className="font-medium text-white transition hover:text-neutral-300"
              >
                Create a team
              </button>{" "}
              and you&apos;ll get one.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-block text-xs text-white/40 transition hover:text-white"
        >
          ← back
        </button>
      </motion.div>
    </div>
  );
}
