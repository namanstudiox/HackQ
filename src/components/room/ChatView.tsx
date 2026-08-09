"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Beams } from "@/components/ui/beams";
import { Avatar } from "@/components/room/Avatar";
import {
  appendChatMessage,
  loadChat,
  roleCan,
  subscribeToRoom,
  type ChatMessage,
  type RoomConfig,
  type TeamMember,
} from "@/lib/room-config";
import { cn } from "@/lib/utils";

/** Auto-stop recordings at a minute — keeps each note inside localStorage budget. */
const MAX_VOICE_SECONDS = 60;

const SendIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4z" />
  </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3.5" />
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M7.5 4.5v15l12-7.5z" />
  </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6.5" y="4.5" width="4" height="15" rx="1" />
    <rect x="13.5" y="4.5" width="4" height="15" rx="1" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className={className}
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** mm:ss for voice notes and the recording timer. */
function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Pick the best audio mime the browser can record (Safari → mp4, rest → webm/opus). */
function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the recording"));
    reader.readAsDataURL(blob);
  });
}

/** Deterministic pseudo-waveform from the message id — no audio decoding needed. */
function waveBars(seed: string, count: number): number[] {
  const bars: number[] = [];
  let h = 2166136261;
  for (let i = 0; i < count; i++) {
    h ^= seed.charCodeAt(i % seed.length);
    h = Math.imul(h, 16777619) >>> 0;
    bars.push(0.3 + ((h % 100) / 100) * 0.7);
  }
  return bars;
}

export default function ChatView({
  config,
  me,
}: {
  config: RoomConfig;
  /** The member object that represents *me* in this room. */
  me: TeamMember;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Capability gate — mirrors the server-side `chat` RLS policy.
  const canChat = roleCan(me.role, config.roles, "chat");

  /* ---------- voice recording ---------- */
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const secsRef = useRef(0);
  const discardRef = useRef(false);
  // Guards finalizeRecording against updates after unmount (cleanup stops the
  // recorder, which fires onstop asynchronously).
  const aliveRef = useRef(true);

  /* ---------- voice playback ---------- */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  // The note the element is pointed at + the pending canplaythrough handler —
  // stale handlers from abandoned notes check this and bail.
  const playTargetRef = useRef<string | null>(null);
  const pendingPlayRef = useRef<(() => void) | null>(null);

  // Load once, then live-update via Supabase realtime (debounced refetch so
  // bursts don't re-download the whole history).
  useEffect(() => {
    let alive = true;
    let debounce: number | null = null;
    const refresh = () => {
      void loadChat(config.teamId).then((msgs) => {
        if (alive) setMessages(msgs);
      });
    };
    refresh();
    const onEvent = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (alive) refresh();
      }, 250);
    };
    const unsubscribe = subscribeToRoom(config.teamId, "messages", onEvent);
    return () => {
      alive = false;
      unsubscribe();
      if (debounce) window.clearTimeout(debounce);
    };
  }, [config.teamId]);

  // Keep the view pinned to the newest message (unless the user scrolled up).
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, atBottom]);

  // Stop the mic + recorder if the view unmounts mid-recording.
  useEffect(
    () => () => {
      aliveRef.current = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (mediaRec.current && mediaRec.current.state !== "inactive") {
        discardRef.current = true;
        mediaRec.current.stop();
      }
    },
    []
  );

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const msg = await appendChatMessage(config.teamId, {
      authorId: me.id,
      text,
    });
    if (msg) setMessages((prev) => [...prev, msg].slice(-500));
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    inputRef.current?.focus();
  };

  const sendVoice = async (dataUrl: string, seconds: number) => {
    const msg = await appendChatMessage(config.teamId, {
      authorId: me.id,
      text: "",
      voice: dataUrl,
      voiceDuration: seconds,
    });
    if (msg) setMessages((prev) => [...prev, msg]);
  };

  /** Stop the recorder; `send` decides whether the blob becomes a message. */
  const stopRecording = (sendIt: boolean) => {
    const rec = mediaRec.current;
    if (rec && rec.state !== "inactive") {
      discardRef.current = !sendIt;
      rec.stop();
    }
  };

  /** Runs on MediaRecorder stop — tears down, then sends the blob if wanted. */
  const finalizeRecording = async () => {
    const stream = streamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const secs = secsRef.current;
    const blob = new Blob(chunksRef.current, { type: pickMime() ?? "audio/webm" });
    const shouldSend = !discardRef.current;
    if (aliveRef.current) {
      setRecording(false);
      setRecSeconds(0);
    }
    secsRef.current = 0;
    if (shouldSend && blob.size > 0) {
      if (secs < 1) {
        // A sub-second blip is almost certainly an accidental tap.
        if (aliveRef.current) setMicError("Recording was too short — hold the mic a beat longer.");
        return;
      }
      try {
        const dataUrl = await blobToDataURL(blob);
        sendVoice(dataUrl, Math.max(1, Math.round(secs)));
      } catch {
        if (aliveRef.current) setMicError("Couldn't save that recording — try a shorter one.");
      }
    }
  };

  const startRecording = async () => {
    if (recording) return;
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError("Voice notes aren't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRec.current = rec;
      streamRef.current = stream;
      chunksRef.current = [];
      discardRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        void finalizeRecording();
      };
      rec.start();
      secsRef.current = 0;
      setRecSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        secsRef.current += 1;
        setRecSeconds(secsRef.current);
        if (secsRef.current >= MAX_VOICE_SECONDS) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          stopRecording(true);
        }
      }, 1000);
    } catch {
      setMicError("Microphone access was denied — allow the mic to record voice notes.");
    }
  };

  /**
   * Play/pause a voice note — only one note plays at a time.
   *
   * Reusing one element across notes is the classic Chromium footgun: assigning
   * `src` without `load()` can leave the element in a stale state where play()
   * resolves but nothing is heard. So we reset + load() explicitly, then start
   * playback only once the source is actually ready (canplaythrough, or
   * immediately for tiny already-buffered data URLs). Failures surface as a
   * toast instead of a silently dead button.
   */
  const togglePlay = (m: ChatMessage) => {
    const audio = audioRef.current;
    if (!audio || !m.voice) return;
    if (playingId === m.id) {
      playTargetRef.current = null;
      if (pendingPlayRef.current) {
        audio.removeEventListener("canplaythrough", pendingPlayRef.current);
        pendingPlayRef.current = null;
      }
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
      setPlayProgress(0);
      return;
    }
    setMicError(null);
    playTargetRef.current = m.id;
    // Drop any pending handler from the previous note before re-pointing.
    if (pendingPlayRef.current) {
      audio.removeEventListener("canplaythrough", pendingPlayRef.current);
      pendingPlayRef.current = null;
    }
    audio.pause();
    audio.src = m.voice;
    audio.load();
    setPlayingId(m.id);
    setPlayProgress(0);
    const start = () => {
      if (pendingPlayRef.current === start) pendingPlayRef.current = null;
      // A newer note may have replaced this one while the source was loading.
      if (playTargetRef.current !== m.id) return;
      void audio.play().catch((err: unknown) => {
        if (playTargetRef.current !== m.id) return;
        playTargetRef.current = null;
        setPlayingId(null);
        setPlayProgress(0);
        setMicError(
          err instanceof DOMException && err.name === "NotSupportedError"
            ? "This voice note's format isn't supported in your browser."
            : "Playback was blocked — tap play again to hear the note."
        );
      });
    };
    if (audio.readyState >= 3) {
      // Already buffered (small data URL) — no need to wait for the event.
      start();
    } else {
      pendingPlayRef.current = start;
      audio.addEventListener("canplaythrough", start);
    }
  };

  return (
    <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
      <Beams />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-80 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl [mask-image:radial-gradient(70%_70%_at_50%_25%,black,transparent_75%)]"
      />

      {/* Header */}
      <div className="relative z-10 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// chat"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Team chat
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {config.members.map((m) => (
              <Avatar key={m.id} name={m.name} color={m.color} src={m.pfp} size="sm" />
            ))}
          </div>
          <span className="font-mono text-[11px] text-white/50">
            {config.members.length} in the room
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={() => {
          const el = listRef.current;
          if (!el) return;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
        }}
        className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60">
              <SendIcon className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-white/70">No messages yet</p>
            <p className="max-w-xs text-xs leading-relaxed text-white/40">
              Decisions, links, and late-night breakthroughs live here. Break the silence — or
              drop a voice note.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.authorId === me.id;
            const playing = playingId === m.id;
            // Live identity — current name/pfp/color, falling back to the
            // send-time snapshot if the member has left.
            const member = config.members.find((x) => x.id === m.authorId);
            const author = member
              ? { name: member.name, color: member.color, pfp: member.pfp }
              : { name: m.authorName ?? "?", color: m.authorColor ?? "#888", pfp: m.authorPfp };
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={cn("flex items-end gap-2.5", mine && "flex-row-reverse")}
              >
                <Avatar name={author.name} color={author.color} src={author.pfp} size="sm" />
                <div className={cn("flex max-w-[78%] flex-col gap-1", mine && "items-end")}>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        mine ? "text-white/60" : "text-white/80"
                      )}
                    >
                      {mine ? "you" : author.name}
                    </span>
                    <span className="font-mono text-[9px] text-white/30">{fmtTime(m.at)}</span>
                  </div>
                  {m.voice ? (
                    <VoiceBubble
                      msg={m}
                      mine={mine}
                      playing={playing}
                      progress={playing ? playProgress : 0}
                      onToggle={() => togglePlay(m)}
                    />
                  ) : null}
                  {m.text ? (
                    <div
                      className={cn(
                        "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        mine
                          ? "rounded-br-md bg-white text-black"
                          : "rounded-bl-md border border-white/10 bg-white/[0.05] text-white/90"
                      )}
                    >
                      {m.text}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mic error */}
      {micError && (
        <div className="relative z-10 mt-3 flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/[0.07] px-3 py-2 text-xs text-rose-200">
          <span>{micError}</span>
          <button
            type="button"
            onClick={() => setMicError(null)}
            aria-label="Dismiss"
            className="ml-auto flex h-5 w-5 items-center justify-center rounded text-rose-300/70 transition hover:text-rose-200"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Composer */}
      {canChat ? (
        <form onSubmit={send} className="relative z-10 mt-4 flex items-end gap-2">
        {recording ? (
          <div className="flex min-h-[44px] flex-1 items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-500/[0.06] px-4">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" />
            </span>
            <span className="font-mono text-sm tabular-nums text-white/90">
              {fmtDuration(recSeconds)}
            </span>
            <span className="hidden text-xs text-white/40 sm:inline">voice note · max 60s</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stopRecording(false)}
                aria-label="Cancel recording"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                aria-label="Send voice note"
                className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.15)] transition hover:bg-neutral-200 active:scale-95"
              >
                <CheckIcon className="h-4 w-4" /> send
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              aria-label="Record a voice note (max 60s)"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white/60 transition hover:border-white/30 hover:text-white active:scale-95"
            >
              <MicIcon className="h-4.5 w-4.5" />
            </button>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Message the room…  (Enter to send, Shift+Enter for a new line)"
              aria-label="Message"
              className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white caret-white outline-none transition placeholder:text-neutral-500 hover:border-white/30 focus:border-white/50 focus:ring-4 focus:ring-white/10"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send message"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                draft.trim()
                  ? "bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.15)] hover:bg-neutral-200 active:scale-95"
                  : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/30"
              )}
            >
              <SendIcon className="h-4.5 w-4.5" />
            </button>
          </>
        )}
        </form>
      ) : (
        <p className="relative z-10 mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-xs text-white/40">
          Your role doesn&apos;t include chat — ask the lead to grant it.
        </p>
      )}

      {/* Single shared player — keeps "only one note at a time" trivially true. */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onError={() => {
          // Media error with a note in flight — tell the user, don't leave a dead button.
          if (playTargetRef.current) {
            playTargetRef.current = null;
            setPlayingId(null);
            setPlayProgress(0);
            setMicError("This voice note can't be played in your browser.");
          }
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration && Number.isFinite(el.duration)) {
            setPlayProgress(el.currentTime / el.duration);
          }
        }}
        onEnded={() => {
          playTargetRef.current = null;
          setPlayingId(null);
          setPlayProgress(0);
        }}
      />
    </div>
  );
}

/* ---------- voice-note bubble ---------- */

function VoiceBubble({
  msg,
  mine,
  playing,
  progress,
  onToggle,
}: {
  msg: ChatMessage;
  mine: boolean;
  playing: boolean;
  progress: number;
  onToggle: () => void;
}) {
  const bars = waveBars(msg.id, 26);
  const duration = msg.voiceDuration ?? 0;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
        mine
          ? "rounded-br-md border-transparent bg-white"
          : "rounded-bl-md border-white/10 bg-white/[0.05]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95",
          mine
            ? "bg-black text-white hover:bg-neutral-800"
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-[3px]">
        {bars.map((v, i) => {
          const h = Math.round(5 + v * 23);
          const filled = playing && progress > 0 && i / bars.length <= progress;
          return (
            <span
              key={i}
              className="w-[3px] shrink-0 rounded-full transition-colors duration-150"
              style={{
                height: h,
                background: filled
                  ? mine
                    ? "rgba(0,0,0,0.85)"
                    : "rgba(255,255,255,0.95)"
                  : mine
                    ? "rgba(0,0,0,0.22)"
                    : "rgba(255,255,255,0.28)",
              }}
            />
          );
        })}
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-[10px] tabular-nums",
          mine ? "text-black/50" : "text-white/40"
        )}
      >
        {fmtDuration(duration)}
      </span>
    </div>
  );
}
