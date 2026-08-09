"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Beams } from "@/components/ui/beams";
import RoomCountdown from "@/components/room/RoomCountdown";
import {
  MODULES,
  toLocalInput,
  type RoomConfig,
  type RoomSettings,
  type RoomSettingsPatch,
} from "@/lib/room-config";
import { cn } from "@/lib/utils";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps} strokeWidth={2.5}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <rect x="4.5" y="11" width="15" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const UnlockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <rect x="4.5" y="11" width="15" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-1.8" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4.5" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    <path d="M10 11v5M14 11v5" />
  </svg>
);

const LeaveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9.5V13l2.8 1.8" />
    <path d="M9.5 2.5h5M12 2.5V5" />
  </svg>
);

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 sm:p-6";

const inputClass =
  "h-10 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 text-sm text-white outline-none transition placeholder:text-neutral-500 hover:border-white/30 focus:border-white/50 focus:ring-4 focus:ring-white/10";

/** Minimal switch — used for module toggles + the join lock. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
        checked ? "border-white/40 bg-white" : "border-white/15 bg-white/10"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-200",
          checked ? "left-[calc(100%-1.25rem)] bg-black" : "left-1 bg-white/60"
        )}
      />
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
        {hint && <p className="text-[11px] text-white/40">{hint}</p>}
      </div>
    </div>
  );
}

export default function ControlCentre({
  config,
  isLead,
  onUpdate,
  onRegenerate,
  onDisband,
  onLeave,
  onTransfer,
  onCopy,
  copied,
}: {
  config: RoomConfig;
  /** Whether the viewer is the lead — gates every control. */
  isLead: boolean;
  onUpdate: (patch: RoomSettingsPatch) => void;
  onRegenerate: () => Promise<string | null>;
  onDisband: () => void;
  onLeave: () => void;
  onTransfer: (newOwnerId: string) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const [groupName, setGroupName] = useState(config.groupName);
  const [eventName, setEventName] = useState(config.eventName);
  const [deadline, setDeadline] = useState(() => toLocalInput(new Date(config.deadline)));
  const [saved, setSaved] = useState(false);
  const [armRegen, setArmRegen] = useState(false);
  const [armDisband, setArmDisband] = useState(false);
  const [armLeave, setArmLeave] = useState(false);
  const [armTransfer, setArmTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState<string>("");
  const [regenCode, setRegenCode] = useState<string | null>(null);

  // React's recommended "adjust state during render" pattern — keep the local
  // form in sync when the room identity changes from another tab.
  const [prevIdentity, setPrevIdentity] = useState({
    groupName: config.groupName,
    eventName: config.eventName,
  });
  if (
    prevIdentity.groupName !== config.groupName ||
    prevIdentity.eventName !== config.eventName
  ) {
    setPrevIdentity({ groupName: config.groupName, eventName: config.eventName });
    setGroupName(config.groupName);
    setEventName(config.eventName);
  }

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(id);
  }, [saved]);

  const totalMs = Math.max(0, config.deadline - config.startedAt);

  const saveIdentity = () => {
    onUpdate({
      groupName: groupName.trim() || config.groupName,
      eventName: eventName.trim() || "HackQ Sprint",
    });
    setSaved(true);
  };

  const extendDeadline = (hours: number) => {
    onUpdate({ deadline: config.deadline + hours * 3600 * 1000 });
    setSaved(true);
  };

  const setCustomDeadline = () => {
    const ms = new Date(deadline).getTime();
    if (!Number.isFinite(ms) || ms <= Date.now()) return;
    onUpdate({ deadline: ms });
    setSaved(true);
  };

  const toggleModule = (id: keyof RoomSettings["enabled"]) => {
    onUpdate({
      enabled: { ...config.settings.enabled, [id]: !config.settings.enabled[id] },
    });
  };

  const handleRegenerate = async () => {
    const fresh = await onRegenerate();
    if (fresh) setRegenCode(fresh);
    setArmRegen(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      {/* Hero */}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// control centre"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Command the room
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {config.groupName} · {config.members.length} member
            {config.members.length === 1 ? "" : "s"} ·{" "}
            {config.settings.joinLocked ? "joins locked" : "joins open"}
          </p>
        </div>
        <span
          className={cn(
            "mb-1 flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em]",
            isLead
              ? "border-white/10 bg-white/[0.03] text-white/50"
              : "border-white/15 bg-white/5 text-white/70"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isLead ? "bg-white/80" : "bg-white/40"
            )}
          />
          {isLead ? "you're the lead" : "lead only"}
        </span>
      </div>

      <div className="relative mt-10">
        <Beams />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl [mask-image:radial-gradient(70%_70%_at_50%_25%,black,transparent_75%)]"
        />

        {!isLead && (
          <div className="relative z-10 mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            <LockIcon className="mr-2 inline h-4 w-4 text-white/40" />
            View-only — the lead controls the room from here.
          </div>
        )}

        <div className="relative z-10 grid gap-4 lg:grid-cols-2">
          {/* Identity */}
          <section className={cardClass}>
            <SectionHeader
              icon={<ShieldIcon className="h-4 w-4" />}
              title="Room identity"
              hint="What everyone sees in the room."
            />
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-neutral-300">Group name</span>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={!isLead}
                  className={cn(inputClass, !isLead && "opacity-50")}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-neutral-300">Event name</span>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  disabled={!isLead}
                  className={cn(inputClass, !isLead && "opacity-50")}
                />
              </label>
              {isLead && (
                <button
                  type="button"
                  onClick={saveIdentity}
                  className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-full bg-white px-4 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-[0.98]"
                >
                  {saved ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                  {saved ? "Saved" : "Save changes"}
                </button>
              )}
            </div>
          </section>

          {/* Clock */}
          <section className={cardClass}>
            <SectionHeader
              icon={<ClockIcon className="h-4 w-4" />}
              title="The clock"
              hint="Extend or pull the submission deadline."
            />
            <RoomCountdown
              endTime={config.deadline}
              totalMs={totalMs}
              size="lg"
              className="justify-start"
            />
            <div className="mt-5 flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 6, 12, 24].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => extendDeadline(h)}
                    disabled={!isLead}
                    className={cn(
                      "rounded-lg border border-white/10 bg-white/[0.04] py-1.5 font-mono text-[11px] text-white/60 transition",
                      isLead
                        ? "hover:border-white/30 hover:text-white"
                        : "cursor-not-allowed opacity-40"
                    )}
                  >
                    +{h}h
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={!isLead}
                  className={cn(inputClass, "[color-scheme:dark]", !isLead && "opacity-50")}
                />
                {isLead && (
                  <button
                    type="button"
                    onClick={setCustomDeadline}
                    className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    Set
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Modules */}
          <section className={cardClass}>
            <SectionHeader
              icon={<ShieldIcon className="h-4 w-4" />}
              title="Workspace modules"
              hint="Disabling one hides it from the whole room."
            />
            <div className="flex flex-col divide-y divide-white/5">
              {MODULES.map((m) => {
                const on = config.settings.enabled[m.id];
                return (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{m.label}</p>
                      <p className="text-[11px] text-white/40">{m.desc}</p>
                    </div>
                    <Switch
                      checked={on}
                      onChange={() => isLead && toggleModule(m.id)}
                      label={`${on ? "Disable" : "Enable"} ${m.label}`}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Access */}
          <section className={cardClass}>
            <SectionHeader
              icon={config.settings.joinLocked ? <LockIcon className="h-4 w-4" /> : <UnlockIcon className="h-4 w-4" />}
              title="Access"
              hint="Who can get in, and with what code."
            />
            <div className="flex items-center gap-3">
              <p className="break-all font-mono text-lg font-semibold tracking-tight text-white">
                {regenCode ?? config.roomCode}
              </p>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[11px] font-bold text-black transition hover:bg-neutral-200 active:scale-[0.98]"
              >
                {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[13px] font-medium text-white">Pause new joins</p>
                <p className="text-[11px] text-white/40">Existing members stay, requests stop.</p>
              </div>
              <Switch
                checked={config.settings.joinLocked}
                onChange={() =>
                  isLead &&
                  onUpdate({ joinLocked: !config.settings.joinLocked })
                }
                label={config.settings.joinLocked ? "Unlock joins" : "Lock joins"}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div>
                <p className="text-[13px] font-medium text-white">Rotate invite code</p>
                <p className="text-[11px] text-white/40">
                  Old links stop working — pending join requests reset.
                </p>
              </div>
              {isLead &&
                (armRegen ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-black transition hover:bg-neutral-200"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setArmRegen(false)}
                      className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-white/60 transition hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArmRegen(true)}
                    className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    New code
                  </button>
                ))}
            </div>
          </section>
        </div>

        {/* Ownership — the lead can hand the room over instead of disbanding. */}
        {isLead && (
          <section className="relative z-10 mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <SectionHeader
              icon={<ShieldIcon className="h-4 w-4 text-white/60" />}
              title="Ownership"
              hint="Pass the room to a teammate — you step down to a member."
            />
            <div className="flex flex-wrap items-end justify-between gap-3">
              <p className="max-w-md text-[13px] leading-relaxed text-white/60">
                Handing over makes the chosen member the new lead. You stay in the room as a
                regular member — they can hand it back to you later.
              </p>
              <div className="flex flex-col gap-2">
                <select
                  value={transferTo}
                  onChange={(e) => {
                    setTransferTo(e.target.value);
                    setArmTransfer(false);
                  }}
                  disabled={armTransfer}
                  aria-label="Transfer ownership to"
                  className="h-9 rounded-md border border-white/15 bg-black px-2 text-xs text-white outline-none transition hover:border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/10 disabled:opacity-50 [color-scheme:dark]"
                >
                  <option value="">Choose a member…</option>
                  {config.members
                    .filter((m) => m.id !== config.me)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
                {armTransfer ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const id = transferTo;
                        setArmTransfer(false);
                        if (id) onTransfer(id);
                      }}
                      className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-neutral-200"
                    >
                      Yes, hand over the room
                    </button>
                    <button
                      type="button"
                      onClick={() => setArmTransfer(false)}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-white/60 transition hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!transferTo}
                    onClick={() => setArmTransfer(true)}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Transfer ownership
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Danger zone */}
        {isLead && (
          <section className="relative z-10 mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-5 sm:p-6">
            <SectionHeader
              icon={<TrashIcon className="h-4 w-4 text-red-300" />}
              title="Danger zone"
              hint="Irreversible — the room and its record are deleted."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-[13px] leading-relaxed text-white/60">
                Disbanding removes the team from the registry. Everyone loses access and the invite
                code stops working.
              </p>
              {armDisband ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={onDisband}
                    className="rounded-md bg-red-500 px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-red-400"
                  >
                    Yes, disband the room
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmDisband(false)}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-white/60 transition hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setArmDisband(true)}
                  className="rounded-md border border-red-400/40 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-400/10"
                >
                  Disband room
                </button>
              )}
            </div>
          </section>
        )}

        {/* Leaving — non-leads can walk out; the team keeps running. */}
        {!isLead && (
          <section className="relative z-10 mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <SectionHeader
              icon={<LeaveIcon className="h-4 w-4 text-white/60" />}
              title="Leave the room"
              hint="You can rejoin anytime with the invite code."
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-[13px] leading-relaxed text-white/60">
                Leaving removes you from this team — your account stays, and the invite code keeps
                working for everyone else.
              </p>
              {armLeave ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setArmLeave(false);
                      onLeave();
                    }}
                    className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-neutral-200"
                  >
                    Yes, leave the room
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmLeave(false)}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-white/60 transition hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setArmLeave(true)}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  Leave the room
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
