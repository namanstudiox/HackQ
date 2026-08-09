"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { Beams } from "@/components/ui/beams";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import {
  getRequestStatus,
  loadMyTeam,
  rememberTeam,
  type RoomConfig,
} from "@/lib/room-config";

/** A join request awaiting the team lead's clearance. */
export interface JoinRequest {
  teamId: string;
  teamName: string;
}

/**
 * "Request sent" screen: polls the server until the lead approves (auto-enters
 * the room), declines (shows the declined state), or the request disappears
 * (treated as declined).
 */
export default function JoinPending({
  request,
  onEnter,
  onCancel,
}: {
  request: JoinRequest;
  onEnter: (cfg: RoomConfig) => void;
  onCancel: () => void;
}) {
  const [declined, setDeclined] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const status = await getRequestStatus(request.teamId);
        if (cancelled) return;
        if (status === "approved") {
          const cfg = await loadMyTeam(request.teamId);
          if (cfg && !cancelled) {
            rememberTeam(cfg.slug);
            onEnter(cfg);
          }
        } else if (status === "declined" || status === "missing") {
          // Resolved — stop polling and show the declined state.
          if (!cancelled) {
            if (timer.current) window.clearInterval(timer.current);
            timer.current = null;
            setDeclined(true);
          }
        }
      } catch {
        /* transient error — keep polling */
      }
    };

    const raf = requestAnimationFrame(() => void check());
    timer.current = window.setInterval(() => void check(), 2500);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [request, onEnter]);

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
        className="relative z-10 w-full max-w-md text-center"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 sm:p-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {declined ? "// request declined" : "// awaiting clearance"}
          </p>

          {declined ? (
            <>
              <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">
                {request.teamName} said no
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                The team lead declined your request to join. Maybe ask for a fresh code, or start
                your own team.
              </p>
              <HoverBorderGradient onClick={onCancel} className="mt-7 w-full">
                Back to start
              </HoverBorderGradient>
            </>
          ) : (
            <>
              <div className="mx-auto mt-6 h-12 w-12">
                <span className="block h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-white" />
              </div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">Request sent</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Waiting for <span className="text-white">{request.teamName}</span> to let you in
                — we&apos;ll drop you straight into the room the moment they approve.
              </p>
              <button
                type="button"
                onClick={onCancel}
                className="mt-7 text-xs text-white/40 transition hover:text-white"
              >
                Cancel request
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
