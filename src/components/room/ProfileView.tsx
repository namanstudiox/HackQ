"use client";

import { useEffect, useRef, useState } from "react";
import { Beams } from "@/components/ui/beams";
import { Avatar } from "@/components/room/Avatar";
import {
  MEMBER_COLORS,
  TEAM_ROLES,
  fileToProfilePic,
  type ProfilePatch,
  type RoomConfig,
  type TeamMember,
} from "@/lib/room-config";
import { cn } from "@/lib/utils";

const CameraIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
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

const inputClass =
  "h-11 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3.5 text-[15px] text-white caret-white outline-none transition-all duration-200 placeholder:text-neutral-500 hover:bg-white/[0.07] hover:border-white/30 focus:border-white/50 focus:bg-white/[0.07] focus:ring-4 focus:ring-white/10";

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 sm:p-6";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";

const ROLE_PILL: Record<TeamMember["role"], string> = {
  lead: "bg-white text-black",
  "co-lead": "border border-white/30 bg-white/10 text-white",
  member: "border border-white/10 bg-white/5 text-white/70",
};

export default function ProfileView({
  config,
  me,
  onSave,
}: {
  config: RoomConfig;
  me: TeamMember;
  onSave: (patch: ProfilePatch) => void;
}) {
  const [name, setName] = useState(me.name);
  const [color, setColor] = useState(me.color);
  const [status, setStatus] = useState(me.status ?? "");
  const [pfp, setPfp] = useState(me.pfp);
  const [busy, setBusy] = useState(false);
  const [picError, setPicError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [saved, setSaved] = useState(false);

  // Keep the form in sync if the member data changes elsewhere (another tab).
  const [prevIdentity, setPrevIdentity] = useState({
    name: me.name,
    color: me.color,
    status: me.status ?? "",
    pfp: me.pfp,
  });
  if (
    prevIdentity.name !== me.name ||
    prevIdentity.color !== me.color ||
    prevIdentity.status !== (me.status ?? "") ||
    prevIdentity.pfp !== me.pfp
  ) {
    setPrevIdentity({ name: me.name, color: me.color, status: me.status ?? "", pfp: me.pfp });
    setName(me.name);
    setColor(me.color);
    setStatus(me.status ?? "");
    setPfp(me.pfp);
  }

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(id);
  }, [saved]);

  const roleMeta = TEAM_ROLES.find((r) => r.id === me.role);
  const dirty =
    name.trim() !== me.name ||
    color !== me.color ||
    status.trim() !== (me.status ?? "") ||
    pfp !== me.pfp;

  const save = () => {
    onSave({
      name: name.trim() || me.name,
      color,
      status: status.trim() ? status : "",
      // Empty string (not undefined) signals "remove the picture" — undefined
      // would be read as "no change" by the registry handler.
      pfp: pfp ?? "",
    });
    setSaved(true);
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setPicError(null);
    try {
      const dataUrl = await fileToProfilePic(file);
      setPfp(dataUrl);
    } catch {
      setPicError("That image couldn&apos;t be read — try a PNG or JPG.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      {/* Hero */}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// profile"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your identity in {config.groupName}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Name, avatar, and status — visible to the whole room.
          </p>
        </div>
        <span
          className={cn(
            "mb-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            ROLE_PILL[me.role]
          )}
        >
          {roleMeta?.label ?? me.role}
        </span>
      </div>

      <div className="relative mt-10">
        <Beams />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl [mask-image:radial-gradient(70%_70%_at_50%_25%,black,transparent_75%)]"
        />

        <div className="relative z-10 grid gap-4 lg:grid-cols-5">
          {/* Preview + editor */}
          <section className={cn(cardClass, "lg:col-span-3")}>
            <p className={labelClass}>appearance</p>

            {/* Live preview */}
            <div className="mt-5 flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-black text-xl font-bold text-black transition-colors duration-300"
                style={{ background: color }}
                title={name.trim() || "you"}
              >
                {pfp ? (
                  <img src={pfp} alt="" className="h-full w-full object-cover" />
                ) : (
                  (name.trim() || "yo").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight text-white">
                  {name.trim() || "Unnamed"}
                </p>
                {status.trim() ? (
                  <p className="truncate text-sm text-white/50">{status.trim()}</p>
                ) : (
                  <p className="text-sm text-white/30">no status set</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-neutral-300">Profile picture</span>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-black text-sm font-bold text-black"
                    style={{ background: color }}
                  >
                    {pfp ? (
                      <img src={pfp} alt="profile preview" className="h-full w-full object-cover" />
                    ) : (
                      (name.trim() || "yo").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      aria-label="Upload profile picture"
                      onChange={(e) => {
                        void pickImage(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={busy}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-[11px] text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                    >
                      <CameraIcon className="h-3.5 w-3.5" />
                      {busy ? "Processing…" : pfp ? "Change picture" : "Upload picture"}
                    </button>
                    {pfp && (
                      <button
                        type="button"
                        onClick={() => setPfp(undefined)}
                        className="self-start text-[11px] text-white/40 transition hover:text-white"
                      >
                        Remove picture
                      </button>
                    )}
                  </div>
                </div>
                {picError && <p className="text-xs text-red-400">{picError}</p>}
                <p className="text-[11px] leading-relaxed text-white/35">
                  Cropped to a square and compressed to 128px — stored in this room, not uploaded
                  anywhere.
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-neutral-300">Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How the room sees you"
                  className={inputClass}
                  autoComplete="off"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-neutral-300">Avatar color</span>
                <p className="-mt-0.5 text-[11px] text-white/35">Shown only when there&apos;s no picture.</p>
                <div className="flex flex-wrap gap-2">
                  {["#ffffff", ...MEMBER_COLORS].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Use avatar color ${c}`}
                      aria-pressed={color === c}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-150",
                        color === c
                          ? "scale-110 border-white shadow-[0_0_14px_rgba(255,255,255,0.35)]"
                          : "border-black/60 hover:scale-105 hover:border-white/40"
                      )}
                      style={{ background: c }}
                    >
                      {color === c && (
                        <CheckIcon className={cn("h-4 w-4", c === "#ffffff" ? "text-black" : "text-black/70")} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-neutral-300">
                  Status <span className="text-neutral-500">(optional)</span>
                </span>
                <input
                  value={status}
                  onChange={(e) => setStatus(e.target.value.slice(0, 80))}
                  placeholder="on the API · owner of the bug · getting coffee"
                  className={inputClass}
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className={cn(
                  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-xs font-bold transition-all duration-200",
                  dirty
                    ? "bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.15)] hover:bg-neutral-200 active:scale-[0.98]"
                    : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/30"
                )}
              >
                {saved ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                {saved ? "Saved" : "Save changes"}
              </button>
              {dirty && <span className="text-[11px] text-white/40">unsaved changes</span>}
            </div>
          </section>

          {/* Info */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <section className={cardClass}>
              <p className={labelClass}>in the room</p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={me.name} color={me.color} src={me.pfp} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{me.name}</p>
                  <p className="text-[11px] text-white/40">
                    {roleMeta?.blurb ?? me.role}
                  </p>
                </div>
              </div>
              <dl className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/40">member id</dt>
                  <dd className="truncate font-mono text-xs text-white/70">{me.id}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/40">room</dt>
                  <dd className="truncate font-mono text-xs text-white/70">{config.roomCode}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/40">role</dt>
                  <dd className="text-white/70">{roleMeta?.label ?? me.role}</dd>
                </div>
              </dl>
            </section>

            <section className={cardClass}>
              <p className={labelClass}>how it spreads</p>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                Your name, picture, color, and status update everywhere at once — the roster,
                presence dots, avatars, and the messages you send from now on. Chat history keeps
                the identity it was written under.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
