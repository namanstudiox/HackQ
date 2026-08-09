"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import RoomCountdown from "@/components/room/RoomCountdown";
import RoomDashboard from "@/components/room/RoomDashboard";
import RoomSetup from "@/components/room/RoomSetup";
import PathPicker from "@/components/room/PathPicker";
import JoinTeam from "@/components/room/JoinTeam";
import JoinPending from "@/components/room/JoinPending";
import TeamView from "@/components/room/TeamView";
import ControlCentre from "@/components/room/ControlCentre";
import ChatView from "@/components/room/ChatView";
import ProfileView from "@/components/room/ProfileView";
import IdeaBoardView from "@/components/room/IdeaBoardView";
import TasksView from "@/components/room/TasksView";
import MoodView from "@/components/room/MoodView";
import { Avatar } from "@/components/room/Avatar";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { Beams } from "@/components/ui/beams";
import { RoomBentoCard } from "@/components/room/RoomBentoCard";
import {
  approveRequest,
  clearRememberedTeam,
  createTeam,
  declineRequest,
  disbandRoom,
  getCurrentUser,
  getRequestStatus,
  leaveTeam,
  loadMyProfile,
  loadMyRooms,
  loadMyTeam,
  loadPendingRequests,
  loadTeamBySlug,
  memberColor,
  regenerateRoomCode,
  rememberTeam,
  requestJoinTeam,
  setMemberRole,
  signOut,
  slugify,
  transferOwnership,
  updateMyProfile,
  updateRoomSettings,
  PATH_LABELS,
  type CustomRole,
  type ModuleId,
  type MyRoom,
  type PendingRequest,
  type ProfilePatch,
  type RoomConfig,
  type RoomPath,
  type RoomSettingsPatch,
  type TeamMember,
} from "@/lib/room-config";
import type { JoinRequest } from "@/components/room/JoinPending";

type ViewId = "overview" | "chat" | "board" | "tasks" | "mood" | "team" | "control" | "profile";
type Phase = "loading" | "rooms" | "path" | "join" | "joinPending" | "setup" | "room" | "private" | "missing";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const HomeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8.5 9h7M8.5 12.5h4" />
  </svg>
);

const BoardIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M4 9.5h16" />
    <path d="M9.5 9.5V20" />
    <path d="M8 12h3M8 15h3" />
  </svg>
);

const KanbanIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <rect x="3.5" y="3" width="5" height="18" rx="1" />
    <rect x="10.5" y="3" width="5" height="13" rx="1" />
    <rect x="17.5" y="3" width="5" height="9" rx="1" />
    <path d="M5.5 7h1M5.5 10h1M12.5 7h1M12.5 10h1M19.5 7h1" />
  </svg>
);

const MoodIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 10.5a1.5 1.5 0 0 0 3 0" />
    <path d="M12.5 10.5a1.5 1.5 0 0 0 3 0" />
    <path d="M8.5 14.5c1.9 2.4 5.1 2.4 7 0" />
  </svg>
);

const TimerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9.5V13l2.8 1.8" />
    <path d="M9.5 2.5h5M12 2.5V5" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5a3.5 3.5 0 0 1 0 7" />
    <path d="M17.5 14.5a6.5 6.5 0 0 1 4 5.5" />
  </svg>
);

const LinkIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps} strokeWidth={2.5}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const BellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

const TeamIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M15 9.2a2.75 2.75 0 0 0 0-5.4" />
    <path d="M17.5 13.5c2 .9 3 2.4 3 4.5" />
    <path d="M16 5.5h4M18 3.5v4" />
  </svg>
);

const SlidersIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <path d="M4 7h16M4 17h16" />
    <circle cx="9" cy="7" r="2" />
    <circle cx="15" cy="17" r="2" />
    <path d="M7 5v4M17 15v4" />
  </svg>
);

const ProfileIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} {...strokeProps}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

const NAV: { id: ViewId; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <HomeIcon className="h-[18px] w-[18px]" /> },
  { id: "chat", label: "Chat", icon: <ChatIcon className="h-[18px] w-[18px]" /> },
  { id: "board", label: "Idea Board", icon: <BoardIcon className="h-[18px] w-[18px]" /> },
  { id: "tasks", label: "Tasks", icon: <KanbanIcon className="h-[18px] w-[18px]" /> },
  { id: "mood", label: "Mood", icon: <MoodIcon className="h-[18px] w-[18px]" /> },
  { id: "team", label: "Team", icon: <TeamIcon className="h-[18px] w-[18px]" /> },
  { id: "control", label: "Control", icon: <SlidersIcon className="h-[18px] w-[18px]" /> },
  { id: "profile", label: "Profile", icon: <ProfileIcon className="h-[18px] w-[18px]" /> },
];

/** Module views can be hidden from the room via the control centre. */
const MODULE_VIEWS: ModuleId[] = ["chat", "board", "tasks", "mood"];

const FEATURES: { id: ViewId; label: string; desc: string; icon: ReactNode }[] = [
  {
    id: "chat",
    label: "Chat",
    desc: "Decisions and late-night breakthroughs beside the work.",
    icon: <ChatIcon className="h-8 w-8 text-white" />,
  },
  {
    id: "board",
    label: "Idea Board",
    desc: "Sticky notes from every spark, before it fades.",
    icon: <BoardIcon className="h-8 w-8 text-white" />,
  },
  {
    id: "tasks",
    label: "Tasks",
    desc: "A kanban that moves relentlessly toward done.",
    icon: <KanbanIcon className="h-8 w-8 text-white" />,
  },
  {
    id: "mood",
    label: "Mood",
    desc: "Quick check-ins, visible to the whole room.",
    icon: <MoodIcon className="h-8 w-8 text-white" />,
  },
];

export default function RoomShell({ slug: slugProp }: { slug?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [meInfo, setMeInfo] = useState<{
    id: string;
    name: string;
    color: string;
    pfp: string | null;
  } | null>(null);
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [path, setPath] = useState<RoomPath>("create");
  const [view, setView] = useState<ViewId>("overview");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // Join flow
  const [joinCode, setJoinCode] = useState("");
  const [joinReq, setJoinReq] = useState<JoinRequest | null>(null);

  // Lead's approvals
  const [pendingReqs, setPendingReqs] = useState<PendingRequest[]>([]);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const approvalsRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    []
  );

  // Close approvals on outside taps — document listener (the header's
  // backdrop-filter is a containing block, so a fixed backdrop wouldn't work).
  useEffect(() => {
    if (!approvalsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = approvalsRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setApprovalsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [approvalsOpen]);

  // Decide where to land after first paint: resolve membership for slug rooms
  // (enter / pending / auto-request / private wall), or deep-link to join for
  // /room?code=. rAF keeps it hydration-safe.
  useEffect(() => {
    const raf = requestAnimationFrame(async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      if (slugProp) {
        const team = await loadTeamBySlug(slugProp);
        if (!team) {
          // Room gone — drop the remembered pointer so /room doesn't bounce back.
          clearRememberedTeam();
          setPhase("missing");
          return;
        }
        setJoinReq({ teamId: team.teamId, teamName: team.groupName });
        const status = await getRequestStatus(team.teamId);
        if (status === "approved") {
          const cfg = await loadMyTeam(team.teamId);
          if (cfg) {
            rememberTeam(cfg.slug);
            setConfig(cfg);
            setPhase("room");
            return;
          }
          setPhase("missing");
          return;
        }
        if (status === "pending") {
          setPhase("joinPending");
          return;
        }
        // Not a member — an invite link carries the code, so request access now.
        const urlCode = new URLSearchParams(window.location.search).get("code");
        if (urlCode) {
          const res = await requestJoinTeam(urlCode);
          if (res.ok) {
            if (res.alreadyMember && res.teamId) {
              const cfg = await loadMyTeam(res.teamId);
              if (cfg) {
                rememberTeam(cfg.slug);
                router.replace(`/room/${cfg.slug}`);
                return;
              }
            }
            if (res.teamId && res.teamName) {
              // Strip the consumed invite code from the URL.
              router.replace(window.location.pathname, { scroll: false });
              setJoinReq({ teamId: res.teamId, teamName: res.teamName });
              setPhase("joinPending");
              return;
            }
          }
        }
        // Not entering — drop the remembered pointer (prevents a redirect loop).
        clearRememberedTeam();
        setPhase("private");
        return;
      }

      // No slug: invite-code deep links lead to the join screen; otherwise
      // show the rooms dashboard (or the create/join picker when empty).
      const urlCode = new URLSearchParams(window.location.search).get("code");
      if (urlCode) {
        setJoinCode(urlCode);
        setPhase("join");
        return;
      }
      const myRooms = await loadMyRooms();
      if (myRooms.length > 0) {
        setRooms(myRooms);
        const me = await getCurrentUser();
        const profile = await loadMyProfile();
        setMeInfo({
          id: me?.id ?? "",
          name: profile?.name ?? me?.email?.split("@")[0] ?? "you",
          color: profile?.color ?? "#ffffff",
          pfp: profile?.pfp ?? null,
        });
        setPhase("rooms");
        return;
      }
      setPhase("path");
    });
    return () => cancelAnimationFrame(raf);
  }, [router, slugProp]);

  // Keep config fresh while in the room (approvals, profiles, roles, deadline).
  useEffect(() => {
    const teamId = config?.teamId;
    if (phase !== "room" || !teamId) return;
    let alive = true;
    const sync = async () => {
      const cfg = await loadMyTeam(teamId);
      if (!alive) return;
      if (!cfg) {
        // Room gone (disbanded in another tab) — drop it.
        clearRememberedTeam();
        setConfig(null);
        setPhase("path");
        return;
      }
      setConfig((c) => {
        if (!c) return c;
        const same =
          c.groupName === cfg.groupName &&
          c.eventName === cfg.eventName &&
          c.deadline === cfg.deadline &&
          c.roomCode === cfg.roomCode &&
          JSON.stringify(c.members) === JSON.stringify(cfg.members) &&
          JSON.stringify(c.settings) === JSON.stringify(cfg.settings);
        return same ? c : cfg;
      });
      const reqs = await loadPendingRequests(teamId);
      if (!alive) return;
      setPendingReqs((prev) =>
        prev.length !== reqs.length || prev.some((p, i) => p.id !== reqs[i]?.id)
          ? reqs
          : prev
      );
    };
    void sync();
    const id = window.setInterval(() => void sync(), 3000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [phase, config?.teamId]);  const handleSetupDone = async (input: {
    groupName: string;
    eventName: string;
    deadline: number;
  }): Promise<boolean> => {
    const cfg = await createTeam(input);
    if (!cfg) return false;
    rememberTeam(cfg.slug);
    router.replace(`/room/${cfg.slug}`);
    return true;
  };

  /** A joiner submits a code → creates a request awaiting clearance. */
  const handleJoinRequest = async (
    code: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await requestJoinTeam(code);
    if (!res.ok) return res;
    if (res.alreadyMember && res.teamId) {
      const cfg = await loadMyTeam(res.teamId);
      if (cfg) {
        rememberTeam(cfg.slug);
        router.replace(`/room/${cfg.slug}`);
      }
      return { ok: true };
    }
    if (res.teamId && res.teamName) {
      setJoinReq({ teamId: res.teamId, teamName: res.teamName });
      setPhase("joinPending");
    }
    return { ok: true };
  };

  const handleJoinApproved = (cfg: RoomConfig) => {
    rememberTeam(cfg.slug);
    router.replace(`/room/${cfg.slug}`);
  };

  const handleJoinCancel = () => {
    setJoinReq(null);
    setPhase(slugProp ? "private" : rooms.length > 0 ? "rooms" : "path");
  };

  const handleApprove = async (id: string) => {
    if (!config) return;
    // DB-backed guard (RLS), mirrored here so the UI can't even attempt it.
    const myRole = config.members.find((m) => m.id === config.me)?.role;
    if (myRole !== "lead" && myRole !== "co-lead") return;
    await approveRequest(config.teamId, id);
    setPendingReqs((p) => p.filter((r) => r.id !== id));
  };

  const handleDecline = async (id: string) => {
    if (!config) return;
    const myRole = config.members.find((m) => m.id === config.me)?.role;
    if (myRole !== "lead" && myRole !== "co-lead") return;
    await declineRequest(config.teamId, id);
    setPendingReqs((p) => p.filter((r) => r.id !== id));
  };

  /** The owner reassigns a member's role — server + local config stay in sync. */
  const handleRoleChange = async (memberId: string, role: string) => {
    if (!config) return;
    await setMemberRole(config.teamId, memberId, role);
    setConfig((c) =>
      c
        ? {
            ...c,
            members: c.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
          }
        : c
    );
  };

  /** Custom roles changed (created/edited/deleted in RoleManager) — merge in. */
  const handleRolesChanged = (roles: CustomRole[]) => {
    setConfig((c) => (c ? { ...c, roles } : c));
  };

  /** Control-centre settings change — persist to the server + this copy. */
  const handleUpdateSettings = async (patch: RoomSettingsPatch) => {
    if (!config) return;
    await updateRoomSettings(config.teamId, patch);
    const next: RoomConfig = {
      ...config,
      settings: { ...config.settings },
    };
    if (patch.groupName !== undefined) next.groupName = patch.groupName;
    if (patch.eventName !== undefined) next.eventName = patch.eventName;
    if (patch.deadline !== undefined) next.deadline = patch.deadline;
    if (patch.enabled !== undefined) {
      next.settings = { ...next.settings, enabled: { ...next.settings.enabled, ...patch.enabled } };
    }
    if (patch.joinLocked !== undefined) next.settings.joinLocked = patch.joinLocked;
    setConfig(next);
  };

  /** Rotate the invite code — returns the fresh code for the UI. */
  const handleRegenerateCode = async (): Promise<string | null> => {
    if (!config) return null;
    const fresh = await regenerateRoomCode(config.teamId);
    setConfig((c) => (c ? { ...c, roomCode: fresh } : c));
    return fresh;
  };

  /** A member saves their own profile — server + local config stay in sync. */
  const handleSaveProfile = async (patch: ProfilePatch) => {
    if (!config || !me) return;
    await updateMyProfile(config.teamId, patch);
    setConfig((c) =>
      c
        ? {
            ...c,
            members: c.members.map((m) =>
              m.id === me.id
                ? {
                    ...m,
                    name: patch.name?.trim() || m.name,
                    color: patch.color ?? m.color,
                    status: patch.status?.trim().slice(0, 80) || undefined,
                    pfp: patch.pfp !== undefined ? patch.pfp || undefined : m.pfp,
                  }
                : m
            ),
          }
        : c
    );
  };

  /** Disband the room — team deleted, back to the path picker. */
  const handleDisband = async () => {
    if (!config) return;
    await disbandRoom(config.teamId);
    clearRememberedTeam();
    setConfig(null);
    const updated = await loadMyRooms();
    setRooms(updated);
    setPhase(updated.length > 0 ? "rooms" : "path");
  };

  /** Hand the room to another member — I step down; they become lead. */
  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!config) return;
    const ok = await transferOwnership(config.teamId, newOwnerId);
    if (!ok) return;
    const meId = config.me;
    // Reflect the handover locally: I'm a member, they're the lead, and I'm
    // bounced to the overview (the poll confirms it server-side).
    setConfig((c) =>
      c
        ? {
            ...c,
            path: "join",
            members: c.members.map((m) =>
              m.id === newOwnerId ? { ...m, role: "lead" } : m.id === meId ? { ...m, role: "member" } : m
            ),
          }
        : c
    );
    setView("overview");
  };

  /** Leave the team — my membership row is deleted, back to the path picker. */
  const handleLeave = async () => {
    if (!config) return;
    const res = await leaveTeam(config.teamId);
    if (!res.ok) return; // rare — errors are logged in the data layer
    clearRememberedTeam();
    setConfig(null);
    const updated = await loadMyRooms();
    setRooms(updated);
    setPhase(updated.length > 0 ? "rooms" : "path");
  };

  const handleLogout = async () => {
    await signOut();
    clearRememberedTeam();
    router.push("/login");
  };

  const copyInvite = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/room/${config.slug}?code=${config.roomCode}`
      );
    } catch {
      /* clipboard unavailable — still show feedback */
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  if (phase === "loading") {
    return <div aria-busy="true" className="h-dvh w-full bg-black" />;
  }

  if (phase === "rooms") {
    return (
      <RoomDashboard
        rooms={rooms}
        me={meInfo}
        onCreate={() => {
          setPath("create");
          setPhase("setup");
        }}
        onJoin={() => setPhase("join")}
        onEnter={(slug) => router.push(`/room/${slug}`)}
        onLogout={handleLogout}
      />
    );
  }

  if (phase === "path") {
    return (
      <PathPicker
        onPick={(p) => {
          setPath(p);
          setPhase(p === "join" ? "join" : "setup");
        }}
      />
    );
  }

  if (phase === "join") {
    return (
      <JoinTeam
        initialCode={joinCode}
        onRequest={handleJoinRequest}
        onBack={() => setPhase(slugProp ? "private" : "path")}
      />
    );
  }

  if (phase === "missing" || phase === "private") {
    const privateRoom = phase === "private";
    return (
      <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-black px-5 py-12 text-white">
        <NoiseTexture frequency={0.9} octaves={3} slope={0.25} noiseOpacity={0.35} />
        <Beams />
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 sm:p-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
              {privateRoom ? "// private room" : "// room not found"}
            </p>
            <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <rect x="4.5" y="11" width="15" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <h1 className="mt-5 text-xl font-semibold tracking-tight">
              {privateRoom
                ? `${joinReq?.teamName ?? "This room"} is private`
                : "This room doesn't exist"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              {privateRoom
                ? "Only approved members can enter. Ask the team lead for the invite code — it'll take you straight in."
                : "It may have been disbanded, or the link is wrong."}
            </p>
            <div className="mt-7 flex flex-col gap-2">
              {privateRoom && (
                <button
                  type="button"
                  onClick={() => setPhase("join")}
                  className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-neutral-200"
                >
                  I have the invite code
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push("/room")}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Go back to start
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "joinPending" && joinReq) {
    return (
      <JoinPending request={joinReq} onEnter={handleJoinApproved} onCancel={handleJoinCancel} />
    );
  }

  if (phase === "setup" || !config) {
    return <RoomSetup path={path} onDone={handleSetupDone} />;
  }

  // Hide disabled modules + gate Control behind the lead, for both navs.
  const isLead = config.path === "create";
  const navItems = NAV.filter((n) =>
    n.id === "control"
      ? isLead
      : MODULE_VIEWS.includes(n.id as ModuleId)
        ? config.settings.enabled[n.id as ModuleId]
        : true
  );
  // If the current view was just disabled, fall back to the overview.
  const safeView: ViewId = MODULE_VIEWS.includes(view as ModuleId)
    ? config.settings.enabled[view as ModuleId]
      ? view
      : "overview"
    : view;
  // Who am I? The member matching config.me — drives authorship + presence.
  const me = config.members.find((m) => m.id === config.me) ?? config.members[0];
  // Who can manage this room (approvals etc.)? The lead, or a co-lead.
  const canManage = isLead || me?.role === "co-lead";

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-black text-white">
      <NoiseTexture frequency={0.9} octaves={3} slope={0.25} noiseOpacity={0.35} />

      {/* Topbar */}
      <header className="relative z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-black/60 px-4 backdrop-blur-md sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 text-white">
            <circle cx="9" cy="12" r="5.5" />
            <circle cx="15" cy="12" r="5.5" />
          </svg>
          HACKQ<span className="text-white/40">.</span>
        </Link>
        <span className="hidden rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-white/50 sm:block">
          room/{slugify(config.groupName)}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-1.5 lg:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
            <span className="font-mono text-[11px] text-white/50">
              {config.members.length} online
            </span>
          </div>
          <div className="hidden -space-x-2 md:flex">
            {config.members.map((m) => (
              <Avatar key={m.id} name={m.name} color={m.color} src={m.pfp} size="sm" />
            ))}
          </div>
          <RoomCountdown endTime={config.deadline} size="sm" />
          <button
            type="button"
            onClick={copyInvite}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "copied" : config.roomCode}</span>
          </button>

          {canManage && pendingReqs.length > 0 && (
            <div className="relative" ref={approvalsRef}>
              <button
                type="button"
                onClick={() => setApprovalsOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={approvalsOpen}
                aria-label={`${pendingReqs.length} join request${pendingReqs.length === 1 ? "" : "s"} pending`}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <BellIcon className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 font-mono text-[9px] font-bold text-black">
                  {pendingReqs.length}
                </span>
              </button>

              {approvalsOpen && (
                <div
                  aria-live="polite"
                  className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#101014]/95 shadow-2xl backdrop-blur"
                >
                    <p className="border-b border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
                      join requests
                    </p>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {pendingReqs.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-white/[0.04]"
                        >
                          <Avatar name={r.name} color={memberColor(r.name)} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{r.name}</p>
                            <p className="text-[11px] text-white/40">wants to join</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApprove(r.id)}
                            className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-black transition hover:bg-neutral-200"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecline(r.id)}
                            className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-white/60 transition hover:border-red-400/40 hover:text-red-400"
                          >
                            Decline
                          </button>
                        </div>
                      ))}
                    </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/50 transition hover:border-white/30 hover:text-white"
          >
            <LogOutIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="relative z-10 flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 md:hidden">
        {navItems.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setView(n.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition",
              safeView === n.id
                ? "bg-white/10 text-white ring-1 ring-inset ring-white/15"
                : "text-white/60 hover:text-white"
            )}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 p-3 md:flex">
          <nav className="flex flex-col gap-1">
            {navItems.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setView(n.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  safeView === n.id
                    ? "bg-white/10 text-white ring-1 ring-inset ring-white/15"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-white/10 bg-neutral-950 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              in the room
            </p>
            <div className="mt-2.5 flex -space-x-1.5">
              {config.members.map((m) => (
                <Avatar key={m.id} name={m.name} color={m.color} src={m.pfp} size="sm" />
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={safeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="min-h-full"
            // Chat, board, tasks + mood fill the viewport height so they scroll internally.
            style={
              safeView === "chat" ||
              safeView === "board" ||
              safeView === "tasks" ||
              safeView === "mood"
                ? { height: "100%" }
                : undefined
            }
          >
            {safeView === "overview" ? (
              <Overview config={config} onOpen={setView} onCopy={copyInvite} copied={copied} />
            ) : safeView === "chat" ? (
              <ChatView config={config} me={me} />
            ) : safeView === "board" ? (
              <IdeaBoardView config={config} me={me} />
            ) : safeView === "tasks" ? (
              <TasksView config={config} me={me} />
            ) : safeView === "mood" ? (
              <MoodView config={config} me={me} />
            ) : safeView === "profile" ? (
              <ProfileView config={config} me={me} onSave={handleSaveProfile} />
            ) : safeView === "team" ? (
              <TeamView
                config={config}
                pendingReqs={pendingReqs}
                isLead={isLead}
                onApprove={handleApprove}
                onDecline={handleDecline}
                onRoleChange={handleRoleChange}
                onRolesChanged={handleRolesChanged}
              />
            ) : safeView === "control" ? (
              <ControlCentre
                config={config}
                isLead={isLead}
                onUpdate={handleUpdateSettings}
                onRegenerate={handleRegenerateCode}
                onDisband={handleDisband}
                onLeave={handleLeave}
                onTransfer={handleTransferOwnership}
                onCopy={copyInvite}
                copied={copied}
              />
            ) : null}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

const PresenceVisual = ({ members }: { members: TeamMember[] }) => (
  <div className="flex w-full flex-col items-center gap-3">
    <div className="flex -space-x-2">
      {members.map((m) => (
        <Avatar key={m.id} name={m.name} color={m.color} src={m.pfp} />
      ))}
    </div>
    <div className="flex flex-wrap justify-center gap-1.5">
      {members.map((m) => (
        <span
          key={m.id}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/70"
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
          {m.name}
        </span>
      ))}
    </div>
    <p className="text-[11px] text-white/40">
      {members.length === 1
        ? "waiting for teammates — share the code"
        : `${members.length} cleared in · all synced`}
    </p>
  </div>
);

const InviteVisual = ({
  code,
  onCopy,
  copied,
}: {
  code: string;
  onCopy: () => void;
  copied: boolean;
}) => (
  <div className="flex w-full flex-col items-center gap-3">
    <p className="break-all text-center font-mono text-2xl font-semibold tracking-tight text-white">
      {code}
    </p>
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.12)] transition-all duration-200 hover:bg-neutral-200 hover:shadow-[0_0_32px_rgba(255,255,255,0.22)] active:scale-[0.97]"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? "Link copied" : "Copy invite link"}
    </button>
  </div>
);

/** Mini SVG scenes for the feature bento cards — same language as the landing. */
const FeatureVisual = ({ id }: { id: ViewId }) => {
  switch (id) {
    case "chat":
      return (
        <svg viewBox="0 0 240 110" fill="none" className="h-auto w-full">
          <rect x="20" y="6" width="200" height="98" rx="12" stroke="#d4d4d4" strokeOpacity="0.15" />
          <circle cx="34" cy="18" r="3" fill="#d4d4d4" />
          <circle cx="46" cy="18" r="3" fill="#d4d4d4" fillOpacity="0.4" />
          <circle cx="58" cy="18" r="3" fill="#d4d4d4" fillOpacity="0.4" />
          <circle cx="196" cy="18" r="3.5" fill="#ffffff" className="pulse-dot" />
          <rect x="34" y="34" width="84" height="12" rx="6" fill="#d4d4d4" fillOpacity="0.12" />
          <rect x="34" y="52" width="62" height="12" rx="6" fill="#d4d4d4" fillOpacity="0.12" />
          <rect x="140" y="52" width="70" height="12" rx="6" fill="#ffffff" fillOpacity="0.5" />
          <rect x="34" y="70" width="96" height="12" rx="6" fill="#d4d4d4" fillOpacity="0.12" />
        </svg>
      );
    case "board":
      return (
        <svg viewBox="0 0 240 110" fill="none" className="h-auto w-full">
          <rect x="18" y="8" width="204" height="94" rx="10" stroke="#d4d4d4" strokeOpacity="0.15" />
          <g
            style={
              {
                "--rot": "-5deg",
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "floaty 6s ease-in-out infinite",
              } as CSSProperties
            }
          >
            <rect x="40" y="28" width="60" height="48" rx="4" fill="#d4d4d4" fillOpacity="0.12" />
            <path d="M48 40h44M48 50h30M48 60h38" stroke="#d4d4d4" strokeOpacity="0.45" />
          </g>
          <g
            style={
              {
                "--rot": "3deg",
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "floaty 5.5s ease-in-out infinite 0.6s",
              } as CSSProperties
            }
          >
            <rect x="122" y="24" width="56" height="46" rx="4" fill="#d4d4d4" fillOpacity="0.2" />
            <path d="M130 36h40M130 46h24M130 56h32" stroke="#d4d4d4" strokeOpacity="0.6" />
          </g>
          <g
            style={
              {
                "--rot": "-2deg",
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "floaty 7s ease-in-out infinite 1.2s",
              } as CSSProperties
            }
          >
            <rect x="160" y="56" width="52" height="38" rx="4" fill="#d4d4d4" fillOpacity="0.15" />
            <path d="M168 68h36M168 78h24" stroke="#d4d4d4" strokeOpacity="0.5" />
          </g>
        </svg>
      );
    case "tasks":
      return (
        <svg viewBox="0 0 240 110" fill="none" className="h-auto w-full">
          <rect x="22" y="10" width="58" height="90" rx="6" stroke="#d4d4d4" strokeOpacity="0.2" />
          <rect x="91" y="10" width="58" height="90" rx="6" stroke="#d4d4d4" strokeOpacity="0.2" />
          <rect x="160" y="10" width="58" height="90" rx="6" stroke="#d4d4d4" strokeOpacity="0.2" />
          <rect x="30" y="20" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.3" />
          <rect x="30" y="36" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.18" />
          <rect x="99" y="20" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.4" />
          <rect x="99" y="36" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.25" />
          <rect x="168" y="20" width="42" height="10" rx="3" fill="#d4d4d4" fillOpacity="0.5" />
          <g
            style={
              {
                "--rot": "6deg",
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: "floaty 4.5s ease-in-out infinite",
              } as CSSProperties
            }
          >
            <rect x="118" y="64" width="44" height="12" rx="4" fill="#ffffff" fillOpacity="0.9" />
          </g>
        </svg>
      );
    case "mood":
      return (
        <svg viewBox="0 0 240 110" fill="none" className="h-auto w-full">
          <path d="M22 88h196" stroke="#d4d4d4" strokeOpacity="0.12" />
          <rect x="30" y="66" width="18" height="22" rx="4" fill="#d4d4d4" fillOpacity="0.25" />
          <rect x="58" y="58" width="18" height="30" rx="4" fill="#d4d4d4" fillOpacity="0.35" />
          <rect x="86" y="46" width="18" height="42" rx="4" fill="#d4d4d4" fillOpacity="0.5" />
          <rect x="114" y="54" width="18" height="34" rx="4" fill="#d4d4d4" fillOpacity="0.45" />
          <rect
            x="142"
            y="38"
            width="18"
            height="50"
            rx="4"
            fill="#ffffff"
            fillOpacity="0.9"
            style={{
              animation: "glowPulse 2.6s ease-in-out infinite",
              filter: "drop-shadow(0 0 8px rgba(255,255,255,0.45))",
            }}
          />
          <rect x="170" y="60" width="18" height="28" rx="4" fill="#d4d4d4" fillOpacity="0.3" />
          <rect x="198" y="50" width="18" height="38" rx="4" fill="#d4d4d4" fillOpacity="0.4" />
        </svg>
      );
  }
};

function Overview({
  config,
  onOpen,
  onCopy,
  copied,
}: {
  config: RoomConfig;
  onOpen: (v: ViewId) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const submitAt = new Date(config.deadline).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const totalMs = Math.max(0, config.deadline - config.startedAt);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      {/* Hero */}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// room overview"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {config.groupName}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {config.eventName} · {PATH_LABELS[config.path]} · submitting {submitAt}
          </p>
        </div>
        <span className="mb-1 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
          sprint live
        </span>
      </div>

      {/* Ambient beams + a soft top glow behind the cards. NO extra grain
          layer here — the room-root NoiseTexture already covers this area, and
          a second clipped layer reads as a visible box around the grid. */}
      <div className="relative mt-10">
        <Beams />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl [mask-image:radial-gradient(70%_70%_at_50%_25%,black,transparent_75%)]"
        />

        {/* Status row */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="relative z-10 grid gap-4 lg:grid-cols-3"
        >
          <RoomBentoCard
            name="Time left"
            description={`Submits ${submitAt} — every minute is a build minute.`}
            icon={<TimerIcon className="h-8 w-8 text-white" />}
            visual={
              <RoomCountdown
                endTime={config.deadline}
                totalMs={totalMs}
                size="lg"
                className="w-full justify-center"
              />
            }
          />
          <RoomBentoCard
            name="In the room"
            description="Cleared in by the lead — everyone sees the same loop."
            icon={<UsersIcon className="h-8 w-8 text-white" />}
            visual={<PresenceVisual members={config.members} />}
          />
          <RoomBentoCard
            name="Invite code"
            description="Share it — new joiners wait for your approval."
            icon={<LinkIcon className="h-8 w-8 text-white" />}
            visual={<InviteVisual code={config.roomCode} onCopy={onCopy} copied={copied} />}
          />
        </motion.div>

        {/* Workspace section label */}
        <p className="relative z-10 mt-10 mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          {"// workspace"}
        </p>

        {/* Feature slots */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.filter((f) => config.settings.enabled[f.id as ModuleId]).map((f) => (
            <RoomBentoCard
              key={f.id}
              name={f.label}
              description={f.desc}
              icon={f.icon}
              visual={<FeatureVisual id={f.id} />}
              footer={
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 transition group-hover:text-white/70">
                  next up →
                </span>
              }
              onClick={() => onOpen(f.id)}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
