"use client";

import { useState } from "react";
import {
  CUSTOM_ROLE_TEMPLATES,
  EMPTY_PERMISSIONS,
  PERMISSIONS,
  createCustomRole,
  deleteCustomRole,
  loadTeamRoles,
  updateCustomRole,
  type CustomRole,
  type PermissionId,
  type TeamMember,
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

const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    <path d="M10 11v5M14 11v5" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4.5" />
  </svg>
);

const cardClass =
  "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 sm:p-6";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.25em] text-white/40";

const inputClass =
  "h-10 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 text-sm text-white outline-none transition placeholder:text-neutral-500 hover:border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/10";

function PermChip({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        on
          ? "border-white/30 bg-white/10 text-white"
          : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60"
      )}
    >
      {on && <CheckIcon className="h-3 w-3" />}
      {label}
    </button>
  );
}

/**
 * Owner-only custom-role studio: define roles with a custom capability set,
 * edit permissions inline, and delete (holders drop back to member).
 */
export default function RoleManager({
  teamId,
  roles,
  members,
  onRolesChanged,
}: {
  teamId: string;
  roles: CustomRole[];
  members: TeamMember[];
  onRolesChanged: (roles: CustomRole[]) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Record<PermissionId, boolean>>({ ...EMPTY_PERMISSIONS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [armDelete, setArmDelete] = useState<string | null>(null);

  const applyTemplate = (t: (typeof CUSTOM_ROLE_TEMPLATES)[number]) => {
    setName(t.name);
    setPerms({ ...EMPTY_PERMISSIONS, ...t.permissions });
    setError(null);
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the role a name.");
      return;
    }
    if (roles.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("A role with that name already exists.");
      return;
    }
    setBusy(true);
    const created = await createCustomRole(teamId, trimmed, perms);
    if (!created) {
      setBusy(false);
      setError("Couldn't create the role — try again.");
      return;
    }
    onRolesChanged(await loadTeamRoles(teamId));
    setBusy(false);
    setName("");
    setPerms({ ...EMPTY_PERMISSIONS });
    setCreating(false);
    setError(null);
  };

  /** Toggle one capability — optimistic local update, then reconcile to server
   * truth (a concurrent poll could otherwise clobber the optimistic state with
   * a stale read). */
  const togglePermission = async (roleId: string, p: PermissionId) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const nextPerms = { ...role.permissions, [p]: !role.permissions[p] };
    onRolesChanged(roles.map((r) => (r.id === roleId ? { ...r, permissions: nextPerms } : r)));
    await updateCustomRole(teamId, roleId, { permissions: nextPerms });
    onRolesChanged(await loadTeamRoles(teamId));
  };

  const remove = async (roleId: string) => {
    await deleteCustomRole(teamId, roleId);
    onRolesChanged(await loadTeamRoles(teamId));
    setArmDelete(null);
  };

  return (
    <section className={cn("relative z-10", cardClass)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={labelClass}>custom roles</p>
          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-white/50">
            Define roles beyond Lead / Co-lead / Member and give each its own capability set.
          </p>
        </div>
        <ShieldIcon className="h-5 w-5 text-white/30" />
      </div>

      {roles.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-white/40">
          No custom roles yet — create one to hand teammates a focused set of capabilities.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {roles.map((r) => {
            const holders = members.filter((m) => m.role === r.id).length;
            return (
              <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{r.name}</p>
                    <p className="text-[11px] text-white/40">
                      {holders} member{holders === 1 ? "" : "s"} hold this role
                    </p>
                  </div>
                  {armDelete === r.id ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-bold text-black transition hover:bg-red-400"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setArmDelete(null)}
                        className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-white/60 transition hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setArmDelete(r.id)}
                      className="flex items-center gap-1 rounded-md border border-red-400/30 px-2.5 py-1 text-[11px] font-semibold text-red-300/80 transition hover:border-red-400/60 hover:text-red-300"
                    >
                      <TrashIcon className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PERMISSIONS.map((p) => (
                    <PermChip
                      key={p.id}
                      on={r.permissions[p.id] ?? false}
                      label={p.label}
                      onClick={() => togglePermission(r.id, p.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creator */}
      {creating ? (
        <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.04] p-4">
          <p className={labelClass}>new role</p>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Designer"
            autoFocus
            className={cn(inputClass, "mt-2")}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CUSTOM_ROLE_TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => applyTemplate(t)}
                className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-white/40 hover:text-white"
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PERMISSIONS.map((p) => (
              <PermChip
                key={p.id}
                on={perms[p.id]}
                label={p.label}
                onClick={() => setPerms((s) => ({ ...s, [p.id]: !s[p.id] }))}
              />
            ))}
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-400">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-1.5">
            <button
              type="button"
              onClick={create}
              disabled={busy}
              className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create role"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setName("");
                setPerms({ ...EMPTY_PERMISSIONS });
                setError(null);
              }}
              className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-white/60 transition hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-4 flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/70 transition hover:border-white/40 hover:text-white"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New role
        </button>
      )}
    </section>
  );
}
