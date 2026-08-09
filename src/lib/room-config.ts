/* ------------------------------------------------------------------ types */

/** How the room was started — picked on the first-time path screen. */
export type RoomPath = "create" | "join";

const VALID_ROLES: readonly string[] = ["lead", "co-lead", "member"];

export const PATH_LABELS: Record<RoomPath, string> = {
  create: "you're the lead",
  join: "joined via invite",
};

export interface TeamMember {
  /** Stable id — the user's Supabase auth id (uuid). */
  id: string;
  name: string;
  color: string;
  /** One-line status the member set in their profile (e.g. "on the API"). */
  status?: string;
  /** Custom profile picture as a small data URL (client-resized, ~128px). */
  pfp?: string;
  /** Role in the room — a built-in key ("lead" | "co-lead" | "member") or a
   * custom role uuid from `roles`. Drives the permissions matrix. */
  role: string;
}

/** Roles a member can hold in the room. */
export type TeamRole = "lead" | "co-lead" | "member";

export const TEAM_ROLES: { id: TeamRole; label: string; blurb: string }[] = [
  { id: "lead", label: "Lead", blurb: "Full control of the room" },
  { id: "co-lead", label: "Co-lead", blurb: "Helps run the sprint" },
  { id: "member", label: "Member", blurb: "Collaborates on the work" },
];

export type PermissionId =
  | "manage-room"
  | "approve-joins"
  | "manage-roles"
  | "edit-tasks"
  | "post-ideas"
  | "chat"
  | "mood";

export const PERMISSIONS: { id: PermissionId; label: string }[] = [
  { id: "manage-room", label: "Manage room" },
  { id: "approve-joins", label: "Approve joins" },
  { id: "manage-roles", label: "Change roles" },
  { id: "edit-tasks", label: "Edit tasks" },
  { id: "post-ideas", label: "Post ideas" },
  { id: "chat", label: "Chat" },
  { id: "mood", label: "Set mood" },
];

/** A custom role the owner defined — permissions are a per-role capability set. */
export interface CustomRole {
  /** uuid — stored as `team_members.role` on the members holding it. */
  id: string;
  name: string;
  permissions: Record<PermissionId, boolean>;
}

/** Quick-start presets for the role creator. */
export const CUSTOM_ROLE_TEMPLATES: {
  name: string;
  blurb: string;
  permissions: Partial<Record<PermissionId, boolean>>;
}[] = [
  { name: "Designer", blurb: "Owns the board and the vibe", permissions: { "post-ideas": true, chat: true, mood: true } },
  { name: "QA", blurb: "Tracks tasks and signs off", permissions: { "edit-tasks": true, chat: true, mood: true } },
  { name: "Moderator", blurb: "Keeps the room tidy", permissions: { "approve-joins": true, chat: true, mood: true } },
  { name: "Ops", blurb: "Runs the logistics", permissions: { "edit-tasks": true, "post-ideas": true, "approve-joins": true, chat: true, mood: true } },
];

/** All capabilities off — the base a custom role starts from. */
export const EMPTY_PERMISSIONS: Record<PermissionId, boolean> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.id, false])
) as Record<PermissionId, boolean>;

export const ROLE_PERMISSIONS: Record<TeamRole, Record<PermissionId, boolean>> = {
  lead: {
    "manage-room": true,
    "approve-joins": true,
    "manage-roles": true,
    "edit-tasks": true,
    "post-ideas": true,
    chat: true,
    mood: true,
  },
  "co-lead": {
    "manage-room": false,
    "approve-joins": true,
    "manage-roles": false,
    "edit-tasks": true,
    "post-ideas": true,
    chat: true,
    mood: true,
  },
  member: {
    "manage-room": false,
    "approve-joins": false,
    "manage-roles": false,
    "edit-tasks": false,
    "post-ideas": true,
    chat: true,
    mood: true,
  },
};

/** Workspace modules the lead can toggle from the control centre. */
export type ModuleId = "chat" | "board" | "tasks" | "mood";

export const MODULES: { id: ModuleId; label: string; desc: string }[] = [
  { id: "chat", label: "Chat", desc: "Decisions and late-night breakthroughs beside the work." },
  { id: "board", label: "Idea Board", desc: "Sticky notes from every spark, before it fades." },
  { id: "tasks", label: "Tasks", desc: "A kanban that moves relentlessly toward done." },
  { id: "mood", label: "Mood", desc: "Quick check-ins, visible to the whole room." },
];

/** Room-wide settings managed from the control centre. */
export interface RoomSettings {
  /** Which modules are live — disabled ones leave the nav + overview. */
  enabled: Record<ModuleId, boolean>;
  /** When true, new join requests are paused (existing members stay). */
  joinLocked: boolean;
}

/* ----------------------------------------------------- role resolution */

/** Label for any role — a built-in key or a custom role id. */
export function resolveRoleLabel(role: string, roles: CustomRole[]): string {
  const builtin = TEAM_ROLES.find((r) => r.id === role);
  if (builtin) return builtin.label;
  return roles.find((r) => r.id === role)?.name ?? "Member";
}

/** Capability map for any role — the built-in matrix or a custom role's own set. */
export function resolveRolePermissions(
  role: string,
  roles: CustomRole[]
): Record<PermissionId, boolean> {
  if (role in ROLE_PERMISSIONS) return ROLE_PERMISSIONS[role as TeamRole];
  const custom = roles.find((r) => r.id === role);
  return custom ? { ...EMPTY_PERMISSIONS, ...custom.permissions } : EMPTY_PERMISSIONS;
}

/** Whether a role holds a capability (client-side gating + the matrix). */
export function roleCan(
  role: string,
  roles: CustomRole[],
  perm: PermissionId
): boolean {
  return resolveRolePermissions(role, roles)[perm];
}

export function normalizeSettings(raw: {
  modules?: unknown;
  join_locked?: unknown;
  joinLocked?: unknown;
}): RoomSettings {
  const m = (raw.modules ?? {}) as Partial<Record<ModuleId, boolean>>;
  return {
    enabled: {
      chat: m.chat !== false,
      board: m.board !== false,
      tasks: m.tasks !== false,
      mood: m.mood !== false,
    },
    joinLocked: raw.join_locked === true || raw.joinLocked === true,
  };
}

/** A join request awaiting the team lead's clearance. */
export interface PendingRequest {
  id: string;
  name: string;
  /** Epoch ms — when the request was made. */
  at: number;
}

export interface RoomConfig {
  /** Server team id (uuid) — keys every data query. */
  teamId: string;
  groupName: string;
  eventName: string;
  /** Submission deadline as epoch ms — the countdown counts down to this. */
  deadline: number;
  startedAt: number;
  /** Invite code — teammates join with this. */
  roomCode: string;
  /** Starter path — "create" when the viewer is the owner. */
  path: RoomPath;
  /** Approved members — drives presence in the room. */
  members: TeamMember[];
  /** Which member id is *me* (my Supabase uuid). */
  me: string;
  /** Room-wide settings — modules + join lock. */
  settings: RoomSettings;
  /** Custom roles the owner defined (empty until one is created). */
  roles: CustomRole[];
  /** URL slug — this room lives at /room/{slug}. */
  slug: string;
}

/* ------------------------------------------------------------- constants */  // Muted, premium tones — deliberately no lime; the lead stays neutral white.
export const MEMBER_COLORS = [
  "#818cf8", // indigo
  "#7dd3fc", // sky
  "#fbbf24", // amber
  "#f472b6", // pink
  "#a78bfa", // violet
  "#5eead4", // teal
  "#fb923c", // orange
  "#e2e8f0", // slate
];

/** Deterministic avatar color from the palette for a given name. */
export function memberColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[h % MEMBER_COLORS.length];
}

/** Stable-ish unique id for client-side objects (crypto where available). */
export function genId(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Strip a code to its canonical uppercase alphanumeric form. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "Neon Sprint" -> "neon-sprint" (used for the room/slug chip). */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "room";
}

/** Format a Date for <input type="datetime-local">, e.g. "2026-08-09T18:30". */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Sticky-note fill colors — soft pastels that read well on the dark canvas. */
export const NOTE_COLORS = [
  "#fde68a", // amber
  "#f9a8d4", // pink
  "#a5b4fc", // indigo
  "#86efac", // green
  "#c4b5fd", // violet
  "#7dd3fc", // sky
  "#fdba74", // orange
] as const;

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
];

export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export type MoodId = "fired" | "locked" | "okay" | "drained" | "lost";

/** The five check-in moods — muted accents, no emoji, on-brand with the room. */
export const MOODS: { id: MoodId; label: string; color: string }[] = [
  { id: "fired", label: "Fired up", color: "#5eead4" }, // teal
  { id: "locked", label: "Locked in", color: "#7dd3fc" }, // sky
  { id: "okay", label: "Okay", color: "#fbbf24" }, // amber
  { id: "drained", label: "Drained", color: "#fb923c" }, // orange
  { id: "lost", label: "Lost", color: "#f472b6" }, // pink
];

/** One chat message — author identity is resolved live from the roster. */
export interface ChatMessage {
  id: string;
  authorId: string;
  authorName?: string;
  authorColor?: string;
  authorPfp?: string;
  text: string;
  /** Voice-note audio as a data URL (webm/opus or mp4), when a voice message. */
  voice?: string;
  /** Recording length in seconds (rounded up). */
  voiceDuration?: number;
  /** Epoch ms. */
  at: number;
}

/** One sticky note on the infinite canvas (world coordinates). */
export interface IdeaNote {
  id: string;
  text: string;
  /** One of NOTE_COLORS. */
  color: string;
  /** Top-left corner in world px. */
  x: number;
  y: number;
  authorId: string;
  authorName: string;
  authorColor: string;
  authorPfp?: string;
  /** Epoch ms. */
  at: number;
}

/** One task on the board (Notion-style row with properties). */
export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Member id of the assignee, or undefined for unassigned. */
  assigneeId?: string;
  assigneeName?: string;
  assigneeColor?: string;
  assigneePfp?: string;
  /** Due date as epoch ms, or undefined. */
  due?: number;
  authorId: string;
  authorName: string;
  /** Epoch ms. */
  at: number;
}

/** One member's latest check-in — latest wins, per member. */
export interface MoodRecord {
  /** Member id (uuid). */
  memberId: string;
  mood: MoodId;
  /** Optional one-liner (≤120 chars). */
  note?: string;
  /** Epoch ms. */
  at: number;
}

/** A member's own profile edits — name, avatar color, status, and picture. */
export interface ProfilePatch {
  name?: string;
  color?: string;
  status?: string;
  pfp?: string;
}

/** A control-centre change — identity fields, the clock, or room settings. */
export type RoomSettingsPatch = Partial<RoomSettings> &
  Partial<Pick<RoomConfig, "groupName" | "eventName" | "deadline">>;

export type RequestStatus = "approved" | "pending" | "declined" | "missing";

/* ------------------------------------------------------------- supabase */

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!_supabase) _supabase = createBrowserClient();
  return _supabase;
}

const ts = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
const iso = (ms: number) => new Date(ms).toISOString();

/* ---------------------------------------------------------------- session */

/** The slug of the room I was last in — a convenience pointer, not data. */
const LAST_TEAM_KEY = "hackq-last-team";

export function rememberTeam(teamId: string): void {
  try {
    window.localStorage.setItem(LAST_TEAM_KEY, teamId);
  } catch {
    /* noop */
  }
}
export function loadRememberedTeam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_TEAM_KEY);
  } catch {
    return null;
  }
}
export function clearRememberedTeam(): void {
  try {
    window.localStorage.removeItem(LAST_TEAM_KEY);
  } catch {
    /* noop */
  }
}

/** Current signed-in user (or null). */
export async function getCurrentUser(): Promise<{ id: string; email?: string } | null> {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? undefined };
}

/* ------------------------------------------------------------ auth flows */

/** Sign up with email/password — Supabase sends a verification link to the
 * inbox (email confirmation is on by default). Returns `confirmation: true`
 * when the account needs the email link before it can sign in. */
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; confirmation?: boolean }> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { data, error } = await supabase().auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  // With email confirmation on, no session is returned until the link is used.
  if (!data.session) return { ok: true, confirmation: true };
  return { ok: true };
}

/** Sign in with email + password. Unconfirmed accounts get a clear message. */
export async function signIn(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}

/** Send a password-reset email (the /auth/callback route handles the link). */
export async function sendPasswordReset(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { error } = await supabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback`,
  });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  return { ok: true };
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed"))
    return "Verify your email first — we sent a confirmation link to your inbox.";
  if (m.includes("invalid login credentials"))
    return "That email and password don't match an account.";
  if (m.includes("user already registered"))
    return "An account with that email already exists — sign in instead.";
  if (m.includes("password should be"))
    return "Password too weak — use 8+ characters.";
  if (m.includes("rate limit"))
    return "Too many attempts — wait a moment and try again.";
  return message;
}

/* ------------------------------------------------------- team -> config */

type TeamRow = {
  id: string;
  group_name: string;
  event_name: string;
  deadline: string;
  started_at: string;
  invite_code: string;
  join_locked: boolean;
  modules: Record<ModuleId, boolean>;
  owner_id: string;
  slug: string;
};
type MemberRow = {
  id: string;
  name: string;
  color: string;
  status: string | null;
  pfp: string | null;
  role: string;
};

/** Assemble a RoomConfig for `meId` from a team row + its roster. */
function buildConfig(
  team: TeamRow,
  members: MemberRow[],
  meId: string,
  roles: CustomRole[]
): RoomConfig {
  return {
    teamId: team.id,
    groupName: team.group_name,
    eventName: team.event_name,
    deadline: ts(team.deadline),
    startedAt: ts(team.started_at),
    roomCode: team.invite_code,
    slug: team.slug,
    path: meId === team.owner_id ? "create" : "join",
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
      status: m.status ?? undefined,
      pfp: m.pfp ?? undefined,
      // A member's role is a built-in key or a custom role id; anything unknown
      // (role deleted, stale row) falls back to lead (owner) / member.
      role:
        VALID_ROLES.includes(m.role) || roles.some((r) => r.id === m.role)
          ? m.role
          : m.id === team.owner_id
            ? "lead"
            : "member",
    })),
    me: meId,
    settings: normalizeSettings({ modules: team.modules, join_locked: team.join_locked }),
    roles,
  };
}

async function fetchTeamConfig(teamId: string, meId: string): Promise<RoomConfig | null> {
  const { data: team, error } = await supabase()
    .from("teams")
    .select("id, group_name, event_name, deadline, started_at, invite_code, join_locked, modules, owner_id, slug")
    .eq("id", teamId)
    .maybeSingle();
  if (error || !team) return null;

  const { data: roleRows } = await supabase()
    .from("team_roles")
    .select("id, name, permissions")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  const roles: CustomRole[] = (roleRows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    permissions: {
      ...EMPTY_PERMISSIONS,
      ...((r.permissions ?? {}) as Record<string, boolean>),
    },
  }));

  const { data: memberRows } = await supabase()
    .from("team_members")
    .select("team_id, user_id, role")
    .eq("team_id", teamId);
  const userIds = (memberRows ?? []).map((r) => r.user_id as string);
  if (!userIds.length) return null;

  const { data: profiles } = await supabase()
    .from("profiles")
    .select("id, name, color, status, pfp")
    .in("id", userIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const members: MemberRow[] = (memberRows ?? []).map((r) => {
    const p = byId.get(r.user_id as string);
    return {
      id: r.user_id as string,
      name: (p?.name as string) ?? "Teammate",
      color: (p?.color as string) ?? "#ffffff",
      status: (p?.status as string | null) ?? null,
      pfp: (p?.pfp as string | null) ?? null,
      role: r.role as string,
    };
  });

  return buildConfig(team as unknown as TeamRow, members, meId, roles);
}

/* --------------------------------------------------------------- teams */

/** Create a team — I become the owner/lead. Returns the fresh config. */
export async function createTeam(input: {
  groupName: string;
  eventName: string;
  deadline: number;
}): Promise<RoomConfig | null> {
  const me = await getCurrentUser();
  if (!me) return null;

  // Security-definer RPC: slug dedupe + the owner's lead row happen atomically
  // server-side (non-members can't SELECT teams for slug probing anymore).
  const { data, error } = await supabase().rpc("create_team", {
    p_group_name: input.groupName,
    p_event_name: input.eventName,
    p_deadline: iso(input.deadline),
    p_invite_code: genRoomCode(),
  });
  const team = Array.isArray(data) ? data[0] : data;
  if (error || !team) {
    // Surface the real failure (RLS/permission problems are invisible behind
    // the generic "Couldn't set up the room" message otherwise).
    console.error("[createTeam] insert failed:", error?.message ?? error);
    return null;
  }

  const { data: profile } = await supabase()
    .from("profiles")
    .select("id, name, color, status, pfp")
    .eq("id", me.id)
    .maybeSingle();
  const self: MemberRow = {
    id: me.id,
    name: (profile?.name as string) ?? "You",
    color: (profile?.color as string) ?? "#ffffff",
    status: (profile?.status as string | null) ?? null,
    pfp: (profile?.pfp as string | null) ?? null,
    role: "lead",
  };
  return buildConfig(team as unknown as TeamRow, [self], me.id, []);
}

/** Look up a team by its URL slug — the /room/[slug] gateway. Any signed-in
 * user may see that a room exists and its name; membership is checked
 * separately (loadMyTeam / getRequestStatus). */
export async function loadTeamBySlug(
  slug: string
): Promise<{ teamId: string; groupName: string } | null> {
  // Security-definer RPC: non-members can't SELECT teams (invite-code leak),
  // so this returns only the fields the private wall / join flow needs.
  const { data, error } = await supabase().rpc("lookup_team_by_slug", {
    p_slug: slug,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return { teamId: row.id as string, groupName: row.group_name as string };
}

/** Load a team by invite code (join lookup). Null when the code is bogus.
 * Codes are displayed as "HQ-XXXX" but matched via the generated `code_key`
 * column (dash stripped, uppercase) — so "HQ-4F2AK9XM" and "hq4f2ak9xm" both
 * resolve. */
export async function loadTeamByCode(
  code: string
): Promise<{ teamId: string; groupName: string; joinLocked: boolean } | null> {
  const normalized = normalizeCode(code);
  // Security-definer RPC — returns only id / group_name / join_locked.
  const { data, error } = await supabase().rpc("lookup_team_by_code", {
    p_code_key: normalized,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return {
    teamId: row.id as string,
    groupName: row.group_name as string,
    joinLocked: Boolean(row.join_locked),
  };
}

/** Load a team's full config for the current user (null if not a member). */
export async function loadMyTeam(teamId: string): Promise<RoomConfig | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  return fetchTeamConfig(teamId, me.id);
}

/** Submit a join request for the current user; the lead approves it. When the
 * user is already a member, `alreadyMember` is true so the caller can enter
 * the room directly. */
export async function requestJoinTeam(
  code: string
): Promise<{
  ok: boolean;
  error?: string;
  teamId?: string;
  teamName?: string;
  alreadyMember?: boolean;
}> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You need to be signed in to join a team." };
  const team = await loadTeamByCode(code);
  if (!team) return { ok: false, error: "No room found with that code." };

  const { data: existingMember } = await supabase()
    .from("team_members")
    .select("user_id")
    .eq("team_id", team.teamId)
    .eq("user_id", me.id)
    .maybeSingle();
  if (existingMember)
    return { ok: true, teamId: team.teamId, teamName: team.groupName, alreadyMember: true };

  if (team.joinLocked)
    return { ok: false, error: "This room has paused new joins — ask the lead to unlock it." };

  // Clear a previously-declined request — its unique row would block re-requesting.
  await supabase()
    .from("join_requests")
    .delete()
    .eq("team_id", team.teamId)
    .eq("user_id", me.id)
    .eq("status", "declined");

  const { error } = await supabase().from("join_requests").insert({
    team_id: team.teamId,
    user_id: me.id,
    status: "pending",
  });
  if (error) {
    // Unique (team_id, user_id) hit — already requested.
    return { ok: true, teamId: team.teamId, teamName: team.groupName };
  }
  return { ok: true, teamId: team.teamId, teamName: team.groupName };
}

export async function getRequestStatus(teamId: string): Promise<RequestStatus> {
  const me = await getCurrentUser();
  if (!me) return "missing";
  const { data: member } = await supabase()
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("user_id", me.id)
    .maybeSingle();
  if (member) return "approved";
  const { data: req } = await supabase()
    .from("join_requests")
    .select("status")
    .eq("team_id", teamId)
    .eq("user_id", me.id)
    .maybeSingle();
  if (!req) return "missing";
  return (req.status as RequestStatus) === "declined" ? "declined" : "pending";
}

/** All pending join requests for a team (lead/co-lead approval list). */
export async function loadPendingRequests(
  teamId: string
): Promise<PendingRequest[]> {
  const { data: reqs } = await supabase()
    .from("join_requests")
    .select("id, user_id, created_at, status")
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (!reqs?.length) return [];

  const { data: profiles } = await supabase()
    .from("profiles")
    .select("id, name")
    .in(
      "id",
      reqs.map((r) => r.user_id as string)
    );
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.name as string]));
  return reqs.map((r) => ({
    id: r.id as string,
    name: names.get(r.user_id as string) ?? "Teammate",
    at: ts(r.created_at as string),
  }));
}

export async function approveRequest(teamId: string, requestId: string): Promise<void> {
  const { data: req } = await supabase()
    .from("join_requests")
    .select("user_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return;
  await supabase().from("join_requests").update({ status: "approved" }).eq("id", requestId);
  await supabase()
    .from("team_members")
    .upsert({ team_id: teamId, user_id: req.user_id as string, role: "member" });
}

export async function declineRequest(teamId: string, requestId: string): Promise<void> {
  await supabase().from("join_requests").update({ status: "declined" }).eq("id", requestId);
}

/** The owner reassigns a member's role — a built-in key or custom role id. */
export async function setMemberRole(
  teamId: string,
  userId: string,
  role: string
): Promise<void> {
  await supabase().from("team_members").update({ role }).eq("team_id", teamId).eq("user_id", userId);
}

/* ------------------------------------------------------ custom roles */

function mapRoleRow(r: { id: unknown; name: unknown; permissions: unknown }): CustomRole {
  return {
    id: r.id as string,
    name: r.name as string,
    permissions: {
      ...EMPTY_PERMISSIONS,
      ...((r.permissions ?? {}) as Record<string, boolean>),
    },
  };
}

/** All custom roles defined for a team. */
export async function loadTeamRoles(teamId: string): Promise<CustomRole[]> {
  const { data, error } = await supabase()
    .from("team_roles")
    .select("id, name, permissions")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => mapRoleRow(r as never));
}

/** Define a new custom role. Name must be unique per team. */
export async function createCustomRole(
  teamId: string,
  name: string,
  permissions: Partial<Record<PermissionId, boolean>>
): Promise<CustomRole | null> {
  const { data, error } = await supabase()
    .from("team_roles")
    .insert({ team_id: teamId, name: name.trim(), permissions })
    .select("id, name, permissions")
    .single();
  if (error || !data) {
    console.error("[createCustomRole] failed:", error?.message ?? error);
    return null;
  }
  return mapRoleRow(data as never);
}

/** Rename a custom role and/or replace its capability set. */
export async function updateCustomRole(
  teamId: string,
  roleId: string,
  patch: { name?: string; permissions?: Partial<Record<PermissionId, boolean>> }
): Promise<void> {
  const next: Record<string, unknown> = {};
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.permissions !== undefined) next.permissions = patch.permissions;
  const { error } = await supabase()
    .from("team_roles")
    .update(next)
    .eq("id", roleId)
    .eq("team_id", teamId);
  if (error) console.error("[updateCustomRole] failed:", error.message);
}

/** Remove a custom role — anyone holding it drops back to plain member. */
export async function deleteCustomRole(teamId: string, roleId: string): Promise<void> {
  await supabase()
    .from("team_members")
    .update({ role: "member" })
    .eq("team_id", teamId)
    .eq("role", roleId);
  const { error } = await supabase()
    .from("team_roles")
    .delete()
    .eq("id", roleId)
    .eq("team_id", teamId);
  if (error) console.error("[deleteCustomRole] failed:", error.message);
}

/** A member's own profile edits — persisted to their profiles row. */
export async function updateMyProfile(teamId: string, patch: ProfilePatch): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  const next: Record<string, string> = {};
  if (patch.name !== undefined) next.name = patch.name.trim() || "Teammate";
  if (patch.color !== undefined) next.color = patch.color;
  if (patch.status !== undefined) next.status = patch.status.trim().slice(0, 80);
  if (patch.pfp !== undefined) next.pfp = patch.pfp || "";
  await supabase().from("profiles").update(next).eq("id", me.id);
}

/** Control-centre settings change. */
export async function updateRoomSettings(
  teamId: string,
  patch: RoomSettingsPatch
): Promise<void> {
  const teamUpdate: Record<string, unknown> = {};
  if (patch.groupName !== undefined) teamUpdate.group_name = patch.groupName;
  if (patch.eventName !== undefined) teamUpdate.event_name = patch.eventName;
  if (patch.deadline !== undefined) teamUpdate.deadline = iso(patch.deadline);
  if (patch.enabled !== undefined) teamUpdate.modules = patch.enabled;
  if (patch.joinLocked !== undefined) teamUpdate.join_locked = patch.joinLocked;
  await supabase().from("teams").update(teamUpdate).eq("id", teamId);
}

/** Rotate the invite code — old links stop working. */
export async function regenerateRoomCode(teamId: string): Promise<string> {
  const fresh = genRoomCode();
  await supabase().from("teams").update({ invite_code: fresh }).eq("id", teamId);
  return fresh;
}

/** Disband the room — the team row (and everything on it) is deleted. */
export async function disbandRoom(teamId: string): Promise<void> {
  await supabase().from("teams").delete().eq("id", teamId);
}

/**
 * Hand the room to another member. Runs in a security-definer RPC (a plain
 * owner_id UPDATE fails RLS's WITH CHECK). The caller must be the owner and
 * the target an approved member; the old owner steps down to member.
 */
export async function transferOwnership(
  teamId: string,
  newOwnerId: string
): Promise<boolean> {
  const { data, error } = await supabase().rpc("transfer_ownership", {
    p_team: teamId,
    p_new_owner: newOwnerId,
  });
  if (error) {
    console.error("[transferOwnership] failed:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Leave a team — delete my own membership row. The RLS policy
 * `members_delete_self_or_owner` allows `user_id = auth.uid()` deletes, so any
 * member can walk out; the team itself keeps running for everyone else.
 */
export async function leaveTeam(teamId: string): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "You're not signed in." };
  const { error } = await supabase()
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", me.id);
  if (error) {
    console.error("[leaveTeam] failed:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/* ---------------------------------------------------------------- chat */

function mapMessage(row: {
  id: string;
  author_id: string;
  text: string;
  voice: string | null;
  voice_duration: number | null;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    authorId: row.author_id,
    text: row.text,
    voice: row.voice ?? undefined,
    voiceDuration: row.voice_duration ?? undefined,
    at: ts(row.created_at),
  };
}

export async function loadChat(teamId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase()
    .from("messages")
    .select("id, author_id, text, voice, voice_duration, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => mapMessage(r as never));
}

export async function appendChatMessage(
  teamId: string,
  msg: Omit<ChatMessage, "id" | "at">
): Promise<ChatMessage | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data, error } = await supabase()
    .from("messages")
    .insert({
      team_id: teamId,
      author_id: me.id,
      text: msg.text,
      voice: msg.voice ?? null,
      voice_duration: msg.voiceDuration ?? null,
    })
    .select("id, author_id, text, voice, voice_duration, created_at")
    .single();
  if (error || !data) return null;
  return mapMessage(data as never);
}

/* ---------------------------------------------------------------- board */

export async function loadIdeas(teamId: string): Promise<IdeaNote[]> {
  const { data, error } = await supabase()
    .from("ideas")
    .select("id, text, color, x, y, author_id, author_name, author_color, author_pfp, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    text: r.text as string,
    color: r.color as string,
    x: r.x as number,
    y: r.y as number,
    authorId: r.author_id as string,
    authorName: (r.author_name as string) ?? "",
    authorColor: (r.author_color as string) ?? "#888",
    authorPfp: (r.author_pfp as string | null) ?? undefined,
    at: ts(r.created_at as string),
  }));
}

export async function addIdea(
  teamId: string,
  note: Omit<IdeaNote, "id" | "at">
): Promise<IdeaNote | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data, error } = await supabase()
    .from("ideas")
    .insert({
      team_id: teamId,
      text: note.text,
      color: note.color,
      x: note.x,
      y: note.y,
      author_id: me.id,
      author_name: note.authorName,
      author_color: note.authorColor,
      author_pfp: note.authorPfp ?? null,
    })
    .select("id, text, color, x, y, author_id, author_name, author_color, author_pfp, created_at")
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    text: data.text as string,
    color: data.color as string,
    x: data.x as number,
    y: data.y as number,
    authorId: data.author_id as string,
    authorName: (data.author_name as string) ?? "",
    authorColor: (data.author_color as string) ?? "#888",
    authorPfp: (data.author_pfp as string | null) ?? undefined,
    at: ts(data.created_at as string),
  };
}

export async function updateIdeaText(teamId: string, id: string, text: string): Promise<void> {
  await supabase().from("ideas").update({ text }).eq("id", id);
}

export async function moveIdea(teamId: string, id: string, x: number, y: number): Promise<void> {
  await supabase().from("ideas").update({ x, y }).eq("id", id);
}

export async function deleteIdea(teamId: string, id: string): Promise<void> {
  await supabase().from("ideas").delete().eq("id", id);
}

/* --------------------------------------------------------------- tasks */

export async function loadTasks(teamId: string): Promise<TaskItem[]> {
  const { data, error } = await supabase()
    .from("tasks")
    .select(
      "id, title, status, priority, assignee_id, assignee_name, assignee_color, assignee_pfp, due, created_by, created_at"
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as TaskStatus,
    priority: r.priority as TaskPriority,
    assigneeId: (r.assignee_id as string | null) ?? undefined,
    assigneeName: (r.assignee_name as string | null) ?? undefined,
    assigneeColor: (r.assignee_color as string | null) ?? undefined,
    assigneePfp: (r.assignee_pfp as string | null) ?? undefined,
    due: (r.due as string | null) ? ts(r.due as string) : undefined,
    authorId: r.created_by as string,
    authorName: "",
    at: ts(r.created_at as string),
  }));
}

export async function addTask(
  teamId: string,
  task: Omit<TaskItem, "id" | "at">
): Promise<TaskItem | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data, error } = await supabase()
    .from("tasks")
    .insert({
      team_id: teamId,
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assigneeId ?? null,
      assignee_name: task.assigneeName ?? null,
      assignee_color: task.assigneeColor ?? null,
      assignee_pfp: task.assigneePfp ?? null,
      due: task.due ? iso(task.due) : null,
      created_by: me.id,
    })
    .select(
      "id, title, status, priority, assignee_id, assignee_name, assignee_color, assignee_pfp, due, created_by, created_at"
    )
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    title: data.title as string,
    status: data.status as TaskStatus,
    priority: data.priority as TaskPriority,
    assigneeId: (data.assignee_id as string | null) ?? undefined,
    assigneeName: (data.assignee_name as string | null) ?? undefined,
    assigneeColor: (data.assignee_color as string | null) ?? undefined,
    assigneePfp: (data.assignee_pfp as string | null) ?? undefined,
    due: (data.due as string | null) ? ts(data.due as string) : undefined,
    authorId: data.created_by as string,
    authorName: "",
    at: ts(data.created_at as string),
  };
}

export async function updateTask(
  teamId: string,
  id: string,
  patch: Partial<Omit<TaskItem, "id" | "authorId" | "authorName" | "at">>
): Promise<void> {
  const next: Record<string, unknown> = {};
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.priority !== undefined) next.priority = patch.priority;
  if (patch.assigneeId !== undefined) next.assignee_id = patch.assigneeId || null;
  if (patch.assigneeName !== undefined) next.assignee_name = patch.assigneeName ?? null;
  if (patch.assigneeColor !== undefined) next.assignee_color = patch.assigneeColor ?? null;
  if (patch.assigneePfp !== undefined) next.assignee_pfp = patch.assigneePfp ?? null;
  if (patch.due !== undefined) next.due = patch.due ? iso(patch.due) : null;
  await supabase().from("tasks").update(next).eq("id", id);
}

export async function deleteTask(teamId: string, id: string): Promise<void> {
  await supabase().from("tasks").delete().eq("id", id);
}

/* ---------------------------------------------------------------- mood */

export async function loadMoods(teamId: string): Promise<MoodRecord[]> {
  const { data, error } = await supabase()
    .from("moods")
    .select("user_id, mood, note, created_at")
    .eq("team_id", teamId);
  if (error || !data) return [];
  return data.map((r) => ({
    memberId: r.user_id as string,
    mood: r.mood as MoodId,
    note: (r.note as string | null) ?? undefined,
    at: ts(r.created_at as string),
  }));
}

/** Upsert my check-in (latest wins, per member). */
export async function setMood(
  teamId: string,
  rec: Omit<MoodRecord, "memberId" | "at">
): Promise<MoodRecord | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const { data, error } = await supabase()
    .from("moods")
    .upsert(
      { team_id: teamId, user_id: me.id, mood: rec.mood, note: rec.note ?? null },
      { onConflict: "team_id,user_id" }
    )
    .select("user_id, mood, note, created_at")
    .single();
  if (error || !data) return null;
  return {
    memberId: data.user_id as string,
    mood: data.mood as MoodId,
    note: (data.note as string | null) ?? undefined,
    at: ts(data.created_at as string),
  };
}

/* ------------------------------------------------------------ realtime */

type RealtimeTable = "messages" | "tasks" | "ideas" | "moods";

/** Subscribe to server-side changes for a room's table. Returns an unsubscribe. */
export function subscribeToRoom(
  teamId: string,
  table: RealtimeTable,
  onChange: () => void
): () => void {
  const channel = supabase()
    .channel(`room-${teamId}-${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `team_id=eq.${teamId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    void supabase().removeChannel(channel);
  };
}

/* ------------------------------------------------------------- presence */

/** Another member's live cursor position, received via realtime presence. */
export interface PresenceState {
  memberId: string;
  name: string;
  color: string;
  pfp?: string;
  x: number;
  y: number;
}

export interface PresenceHandle {
  /** Publish a new cursor position (throttle on the caller). */
  update: (state: Omit<PresenceState, "memberId">) => void;
  /** Stop tracking + leave the presence channel. */
  leave: () => void;
}

let _currentUserId: string | null = null;
async function getCurrentUserId(): Promise<string> {
  if (_currentUserId) return _currentUserId;
  const user = await getCurrentUser();
  _currentUserId = user?.id ?? null;
  return _currentUserId ?? "";
}

/**
 * Live-cursor presence on a per-room channel. My tab tracks its position via
 * `handle.update`; everyone else's tabs receive the full presence set whenever
 * anyone moves (or joins/leaves) — no polling.
 */
export function joinPresence(
  teamId: string,
  onPresence: (others: PresenceState[]) => void
): PresenceHandle {
  const channel = supabase().channel(`presence-${teamId}`);
  let latest: Omit<PresenceState, "memberId"> | null = null;
  let memberId = "";

  channel.on("presence", { event: "sync" }, () => {
    const all = channel.presenceState<PresenceState>();
    const others: PresenceState[] = Object.values(all)
      .flatMap((list) => list)
      .filter((p) => Boolean(p && p.memberId))
      .map((p) => ({
        memberId: p.memberId,
        name: p.name,
        color: p.color,
        pfp: p.pfp,
        x: p.x,
        y: p.y,
      }));
    onPresence(others);
  });

  void channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      memberId = await getCurrentUserId();
      if (latest) await channel.track({ memberId, ...latest });
    }
  });

  return {
    update(state) {
      latest = state;
      if (memberId) void channel.track({ memberId, ...state });
    },
    leave() {
      void supabase().removeChannel(channel);
    },
  };
}

/* ---------------------------------------------------------------- codes */

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 32 unambiguous chars

/**
 * Super-random invite code: "HQ-" + 8 chars from a 32-char alphabet
 * (32^8 ≈ 1.1 trillion combos), drawn via crypto.getRandomValues.
 */
export function genRoomCode(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = "";
  // 256 % 32 === 0, so the modulo mapping is perfectly uniform.
  for (let i = 0; i < bytes.length; i++) s += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return `HQ-${s}`;
}

/* ------------------------------------------------------------- profile pic */

/**
 * Downscale an uploaded image to a small square data URL (128px) so profile
 * pictures stay small in the database.
 */
export function fileToProfilePic(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        // Cover-crop the square from the center of the source image.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Image processing failed"));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
