"use client";

import { Beams } from "@/components/ui/beams";
import { Avatar } from "@/components/room/Avatar";
import {
  memberColor,
  PERMISSIONS,
  resolveRoleLabel,
  resolveRolePermissions,
  TEAM_ROLES,
  type CustomRole,
  type PendingRequest,
  type RoomConfig,
  type TeamRole,
} from "@/lib/room-config";
import RoleManager from "@/components/room/RoleManager";
import { cn } from "@/lib/utils";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const BUILTIN_PILL: Record<TeamRole, string> = {
  lead: "bg-white text-black",
  "co-lead": "border border-white/30 bg-white/10 text-white",
  member: "border border-white/10 bg-white/5 text-white/70",
};

const CUSTOM_PILL = "border border-indigo-300/30 bg-indigo-400/10 text-indigo-200";

function pillFor(role: string): string {
  return role in BUILTIN_PILL ? BUILTIN_PILL[role as TeamRole] : CUSTOM_PILL;
}

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 sm:p-6";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";

function RoleBadge({ role, roles }: { role: string; roles: CustomRole[] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        pillFor(role)
      )}
    >
      {resolveRoleLabel(role, roles)}
    </span>
  );
}

export default function TeamView({
  config,
  pendingReqs,
  isLead,
  onApprove,
  onDecline,
  onRoleChange,
  onRolesChanged,
}: {
  config: RoomConfig;
  pendingReqs: PendingRequest[];
  /** Whether the *viewer* is the room's lead — gates role controls. */
  isLead: boolean;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onRoleChange: (memberId: string, role: string) => void;
  onRolesChanged: (roles: CustomRole[]) => void;
}) {
  const leads = Math.max(1, config.members.filter((m) => m.role === "lead").length);
  // Matrix columns: the three built-ins, then the team's custom roles.
  const matrixCols: { id: string; label: string }[] = [
    ...TEAM_ROLES.map((r) => ({ id: r.id, label: r.label })),
    ...config.roles.map((r) => ({ id: r.id, label: r.name })),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      {/* Hero */}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// team"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The roster
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {config.members.length} member{config.members.length === 1 ? "" : "s"} ·{" "}
            {leads === 1 ? "1 lead" : `${leads} leads`} · {pendingReqs.length} pending
          </p>
        </div>
        <span className="mb-1 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
          {config.members.length} online
        </span>
      </div>

      {/* Ambient */}
      <div className="relative mt-10">
        <Beams />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl [mask-image:radial-gradient(70%_70%_at_50%_25%,black,transparent_75%)]"
        />

        {/* Roster */}
        <section className={cn("relative z-10", cardClass)}>
          <p className={labelClass}>members</p>
          <div className="mt-3 flex flex-col divide-y divide-white/5">
            {config.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.name} color={m.color} src={m.pfp} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {m.name}
                    {m.id === config.me && (
                      <span className="ml-1.5 text-[11px] font-normal text-white/35">(you)</span>
                    )}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {TEAM_ROLES.find((r) => r.id === m.role)?.blurb ??
                      (config.roles.some((r) => r.id === m.role)
                        ? "Custom role — see capabilities"
                        : "")}
                  </p>
                </div>
                <RoleBadge role={m.role} roles={config.roles} />
                {isLead && m.id !== config.me && (
                  <select
                    value={m.role}
                    onChange={(e) => onRoleChange(m.id, e.target.value)}
                    aria-label={`Change ${m.name}'s role`}
                    className="h-8 rounded-md border border-white/15 bg-black px-2 text-xs text-white outline-none transition hover:border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/10 [color-scheme:dark]"
                  >
                    {/* "lead" is intentionally absent — the only way to become
                        lead is for the current owner to hand the room over. */}
                    {TEAM_ROLES.filter((r) => r.id !== "lead").map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                    {config.roles.length > 0 && (
                      <optgroup label="Custom">
                        {config.roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="relative z-10 mt-4 grid gap-4 lg:grid-cols-5">
          {/* Permissions matrix */}
          <section className={cn("lg:col-span-3", cardClass)}>
            <p className={labelClass}>permissions</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      capability
                    </th>
                    {matrixCols.map((c) => (
                      <th
                        key={c.id}
                        className={cn(
                          "px-2 py-2 text-center text-[11px] font-semibold",
                          c.id === "lead" ? "text-white" : "text-white/60"
                        )}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {PERMISSIONS.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-4 text-[13px] text-white/70">{p.label}</td>
                      {matrixCols.map((c) => (
                        <td key={c.id} className="px-2 py-2.5 text-center">
                          {resolveRolePermissions(c.id, config.roles)[p.id] ? (
                            <CheckIcon className="mx-auto h-4 w-4 text-white" />
                          ) : (
                            <span className="text-[13px] leading-none text-white/20">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Join requests */}
          <section className={cn("lg:col-span-2", cardClass)}>
            <p className={labelClass}>join requests</p>
            {pendingReqs.length === 0 ? (
              <p className="mt-4 text-sm leading-relaxed text-white/40">
                No one is waiting — share the invite code to grow the team.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {pendingReqs.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <Avatar name={r.name} color={memberColor(r.name)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-white">{r.name}</p>
                      <p className="text-[11px] text-white/40">wants to join</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApprove(r.id)}
                      className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-black transition hover:bg-neutral-200"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline(r.id)}
                      className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-red-400/40 hover:text-red-400"
                    >
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Custom-role studio — owner only. */}
        {isLead && (
          <div className="relative z-10 mt-4">
            <RoleManager
              teamId={config.teamId}
              roles={config.roles}
              members={config.members}
              onRolesChanged={onRolesChanged}
            />
          </div>
        )}
      </div>
    </div>
  );
}
