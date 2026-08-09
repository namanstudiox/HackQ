"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { motion } from "motion/react";
import { Beams } from "@/components/ui/beams";
import { Avatar } from "@/components/room/Avatar";
import {
  addTask,
  deleteTask,
  loadTasks,
  subscribeToRoom,
  ROLE_PERMISSIONS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  updateTask,
  type RoomConfig,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
  type TeamMember,
} from "@/lib/room-config";
import { cn } from "@/lib/utils";

const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: "border-white/15 bg-white/[0.04] text-white/60",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

const fmtDue = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function TasksView({
  config,
  me,
}: {
  config: RoomConfig;
  me: TeamMember;
}) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [view, setView] = useState<"board" | "list">("board");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Stable "now" (purity-safe) — Date.now() in render is flagged by the
  // React-compiler rule; a state initializer is pure and stays stable.
  const [now] = useState(() => Date.now());
  const draftRef = useRef<HTMLInputElement | null>(null);
  const editRef = useRef<HTMLInputElement | null>(null);

  // Permission: "Edit tasks" from the roles matrix (lead + co-lead).
  const canEdit = ROLE_PERMISSIONS[me.role]["edit-tasks"];

  /* ---------- server-hosted sync (load + realtime, debounced) ---------- */
  useEffect(() => {
    let alive = true;
    let debounce: number | null = null;
    const refresh = () => {
      void loadTasks(config.teamId).then((next) => {
        if (alive) setTasks(next);
      });
    };
    refresh();
    const onEvent = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (alive) refresh();
      }, 250);
    };
    const unsubscribe = subscribeToRoom(config.teamId, "tasks", onEvent);
    return () => {
      alive = false;
      unsubscribe();
      if (debounce) window.clearTimeout(debounce);
    };
  }, [config.teamId]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  /* ---------- actions ---------- */
  const createTask = async () => {
    const title = draft.trim();
    if (!title) return;
    const task = await addTask(config.teamId, {
      title,
      status: "todo",
      priority: "medium",
      assigneeId: me.id,
      assigneeName: me.name,
      assigneeColor: me.color,
      assigneePfp: me.pfp,
      authorId: me.id,
      authorName: me.name,
    });
    if (task) setTasks((prev) => [...prev, task]);
    setDraft("");
    draftRef.current?.focus();
  };

  const patch = (id: string, p: Parameters<typeof updateTask>[2]) => {
    void updateTask(config.teamId, id, p);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...p } : t)));
  };

  const remove = (id: string) => {
    void deleteTask(config.teamId, id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const commitTitle = () => {
    if (!editingId) return;
    const title = editTitle.trim();
    if (title) patch(editingId, { title });
    setEditingId(null);
  };

  const cyclePriority = (t: TaskItem) => {
    const idx = TASK_PRIORITIES.indexOf(t.priority);
    patch(t.id, { priority: TASK_PRIORITIES[(idx + 1) % TASK_PRIORITIES.length] });
  };

  const setAssignee = (t: TaskItem, memberId: string) => {
    if (memberId === "unassigned") {
      patch(t.id, { assigneeId: undefined, assigneeName: undefined, assigneeColor: undefined, assigneePfp: undefined });
      return;
    }
    const m = config.members.find((x) => x.id === memberId);
    if (m) {
      patch(t.id, {
        assigneeId: m.id,
        assigneeName: m.name,
        assigneeColor: m.color,
        assigneePfp: m.pfp,
      });
    }
  };

  /* ---------- drag & drop (native) ---------- */
  const onDrop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    setDragOver(null);
    setDragId(null);
    if (id) patch(id, { status });
  };

  const toggleDone = (t: TaskItem) =>
    patch(t.id, { status: t.status === "done" ? "todo" : "done" });

  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s);
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
      <Beams />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-80 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl [mask-image:radial-gradient(70%_70%_at_50%_25%,black,transparent_75%)]"
      />

      {/* Header */}
      <div className="relative z-10 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
            {"// tasks"}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            The board
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} · {doneCount} done
            {!canEdit && " · view only"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[11px] font-medium transition",
                  view === v ? "bg-white text-black" : "text-white/60 hover:text-white"
                )}
              >
                {v === "board" ? "Board" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Composer */}
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTask();
          }}
          className="relative z-10 mb-5 flex items-center gap-2"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
            <PlusIcon className="h-4 w-4" />
          </div>
          <input
            ref={draftRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a task and press Enter…"
            aria-label="New task title"
            className="h-10 w-full max-w-xl rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-sm text-white caret-white outline-none transition placeholder:text-neutral-500 hover:border-white/30 focus:border-white/50 focus:ring-4 focus:ring-white/10"
          />
        </form>
      )}

      {/* Board */}
      {view === "board" ? (
        <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-2 md:grid-cols-3">
          {TASK_STATUSES.map((s) => {
            const col = byStatus(s.id);
            return (
              <div
                key={s.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (canEdit) setDragOver(s.id);
                }}
                onDragLeave={() => setDragOver((d) => (d === s.id ? null : d))}
                onDrop={(e) => canEdit && onDrop(e, s.id)}
                className={cn(
                  "flex min-h-40 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-3 transition-colors",
                  dragOver === s.id && "border-white/30 bg-white/[0.05]"
                )}
              >
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        s.id === "todo" && "bg-white/40",
                        s.id === "in-progress" && "bg-sky-400",
                        s.id === "done" && "bg-emerald-400"
                      )}
                    />
                    <span className="text-[13px] font-semibold text-white/80">{s.label}</span>
                    <span className="font-mono text-[10px] text-white/30">{col.length}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {col.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      canEdit={canEdit}
                      isDragging={dragId === t.id}
                      onDragStart={(e) => {
                        if (!canEdit) return;
                        setDragId(t.id);
                        e.dataTransfer.setData("text/plain", t.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOver(null);
                      }}
                      onToggleDone={() => canEdit && toggleDone(t)}
                      onEdit={() => {
                        if (!canEdit) return;
                        setEditingId(t.id);
                        setEditTitle(t.title);
                      }}
                      onCommit={commitTitle}
                      onCancel={() => setEditingId(null)}
                      onCyclePriority={() => canEdit && cyclePriority(t)}
                      onAssignee={(id) => canEdit && setAssignee(t, id)}
                      onDelete={() => canEdit && remove(t.id)}
                      editing={editingId === t.id}
                      editTitle={editTitle}
                      setEditTitle={setEditTitle}
                      editRef={editRef}
                      members={config.members}
                      now={now}
                    />
                  ))}
                  {col.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 py-6 text-center text-[11px] text-white/30">
                      {s.id === "todo" ? "No tasks yet" : "Nothing here"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view — Notion database rows */
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] pb-2">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            <span className="w-5" />
            <span className="flex-1">Task</span>
            <span className="hidden w-24 text-right sm:block">Priority</span>
            <span className="hidden w-24 text-right sm:block">Assignee</span>
            <span className="hidden w-20 text-right md:block">Due</span>
            <span className="w-5" />
          </div>
          {tasks.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-white/40">
              No tasks yet — add one above.
            </p>
          )}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-3 border-b border-white/5 px-4 py-2.5 transition hover:bg-white/[0.02]"
            >
              <button
                type="button"
                onClick={() => canEdit && toggleDone(t)}
                aria-label={t.status === "done" ? "Mark not done" : "Mark done"}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                  t.status === "done"
                    ? "border-white bg-white text-black"
                    : "border-white/20 text-transparent hover:border-white/50"
                )}
              >
                <CheckIcon className="h-3 w-3" />
              </button>
              <span
                className={cn(
                  "flex-1 truncate text-sm",
                  t.status === "done" ? "text-white/35 line-through" : "text-white/90"
                )}
                onDoubleClick={() => {
                  if (!canEdit) return;
                  setEditingId(t.id);
                  setEditTitle(t.title);
                }}
                title={t.title}
              >
                {editingId === t.id ? (
                  <input
                    ref={editRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitTitle();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded border border-white/30 bg-black/40 px-1.5 py-0.5 text-sm outline-none"
                  />
                ) : (
                  t.title
                )}
              </span>
              <button
                type="button"
                onClick={() => canEdit && cyclePriority(t)}
                aria-label={`Priority: ${t.priority}`}
                className={cn(
                  "hidden w-24 justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition sm:flex",
                  PRIORITY_STYLE[t.priority],
                  canEdit && "hover:brightness-125"
                )}
              >
                {t.priority}
              </button>
              <AssigneePill task={t} members={config.members} canEdit={canEdit} onAssign={setAssignee} />
              <span
                className={cn(
                  "hidden w-20 items-center justify-end gap-1 text-[11px] text-white/50 md:flex",
                  t.due !== undefined && t.due < now && t.status !== "done" && "text-rose-300"
                )}
              >
                {t.due ? <CalendarIcon className="h-3 w-3" /> : null}
                {t.due ? fmtDue(t.due) : "—"}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label={`Delete task: ${t.title}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/30 opacity-0 transition hover:text-white group-hover:opacity-100"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function AssigneePill({
  task,
  members,
  canEdit,
  onAssign,
}: {
  task: TaskItem;
  members: TeamMember[];
  canEdit: boolean;
  onAssign: (t: TaskItem, memberId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!task.assigneeId) {
    return (
      <span className="relative hidden w-24 justify-end sm:flex">
        {canEdit ? (
          <>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[10px] text-white/40 transition hover:border-white/40 hover:text-white"
            >
              Assign
            </button>
            {open && (
              <MemberMenu members={members} onPick={(id) => { onAssign(task, id); setOpen(false); }} onClose={() => setOpen(false)} />
            )}
          </>
        ) : (
          <span className="text-[11px] text-white/30">unassigned</span>
        )}
      </span>
    );
  }
  return (
    <span className="relative hidden w-24 justify-end sm:flex">
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => canEdit && setOpen((o) => !o)}
        title={task.assigneeName}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pl-0.5 pr-2 text-[11px] text-white/70 transition hover:border-white/30"
      >
        <Avatar name={task.assigneeName ?? "?"} color={task.assigneeColor ?? "#888"} src={task.assigneePfp} size="sm" />
        <span className="max-w-14 truncate">{task.assigneeName}</span>
      </button>
      {open && (
        <MemberMenu members={members} onPick={(id) => { onAssign(task, id); setOpen(false); }} onClose={() => setOpen(false)} />
      )}
    </span>
  );
}

function MemberMenu({
  members,
  onPick,
  onClose,
}: {
  members: TeamMember[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#101014]/95 py-1 shadow-2xl backdrop-blur"
    >
      <button
        type="button"
        onClick={() => onPick("unassigned")}
        className="w-full px-3 py-1.5 text-left text-[12px] text-white/60 transition hover:bg-white/5 hover:text-white"
      >
        Unassigned
      </button>
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(m.id)}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          <Avatar name={m.name} color={m.color} src={m.pfp} size="sm" />
          <span className="truncate">{m.name}</span>
        </button>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  canEdit,
  isDragging,
  onDragStart,
  onDragEnd,
  onToggleDone,
  onEdit,
  onCommit,
  onCancel,
  onCyclePriority,
  onAssignee,
  onDelete,
  editing,
  editTitle,
  setEditTitle,
  editRef,
  members,
  now,
}: {
  task: TaskItem;
  canEdit: boolean;
  isDragging: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onCyclePriority: () => void;
  onAssignee: (memberId: string) => void;
  onDelete: () => void;
  editing: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editRef: React.RefObject<HTMLInputElement | null>;
  members: TeamMember[];
  now: number;
}) {
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assigneeRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!assigneeOpen) return;
    const onDown = (e: PointerEvent) => {
      if (assigneeRef.current && e.target instanceof Node && !assigneeRef.current.contains(e.target)) {
        setAssigneeOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [assigneeOpen]);

  return (
    <motion.div
      layout
      draggable={canEdit}
      // Native HTML5 drag (not motion's drag) — capture-phase handlers keep
      // these plain DOM events away from motion's drag gesture system.
      onDragStartCapture={onDragStart}
      onDragEndCapture={onDragEnd}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={cn(
        "group cursor-grab rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-3 transition-all active:cursor-grabbing",
        isDragging && "opacity-40",
        task.status === "done" && "opacity-70"
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onToggleDone}
          disabled={!canEdit}
          aria-label={task.status === "done" ? "Mark not done" : "Mark done"}
          className={cn(
            "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition",
            task.status === "done"
              ? "border-white bg-white text-black"
              : "border-white/20 text-transparent hover:border-white/50",
            !canEdit && "cursor-default"
          )}
        >
          <CheckIcon className="h-3 w-3" />
        </button>
        {editing ? (
          <input
            ref={editRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={onCommit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") onCommit();
              if (e.key === "Escape") onCancel();
            }}
            className="w-full rounded border border-white/30 bg-black/40 px-1.5 py-0.5 text-[13px] outline-none"
          />
        ) : (
          <p
            onDoubleClick={onEdit}
            className={cn(
              "min-w-0 flex-1 text-[13px] leading-snug",
              task.status === "done" ? "text-white/35 line-through" : "text-white/90"
            )}
          >
            {task.title}
          </p>
        )}
      </div>

      {/* Property row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-7">
        <button
          type="button"
          onClick={onCyclePriority}
          disabled={!canEdit}
          aria-label={`Priority: ${task.priority}`}
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
            PRIORITY_STYLE[task.priority],
            canEdit ? "hover:brightness-125" : "cursor-default"
          )}
        >
          {task.priority}
        </button>

        <span ref={assigneeRef} className="relative">
          {task.assigneeId ? (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setAssigneeOpen((o) => !o)}
              title={task.assigneeName}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pl-0.5 pr-2 text-[10px] text-white/70 transition hover:border-white/30"
            >
              <Avatar name={task.assigneeName ?? "?"} color={task.assigneeColor ?? "#888"} src={task.assigneePfp} size="sm" />
              {task.assigneeName}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setAssigneeOpen((o) => !o)}
              className="rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[10px] text-white/40 transition hover:border-white/40 hover:text-white"
            >
              Assign
            </button>
          )}
          {assigneeOpen && (
            <div className="absolute left-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#101014]/95 py-1 shadow-2xl backdrop-blur">
              <button
                type="button"
                onClick={() => { onAssignee("unassigned"); setAssigneeOpen(false); }}
                className="w-full px-3 py-1.5 text-left text-[12px] text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Unassigned
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onAssignee(m.id); setAssigneeOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white/80 transition hover:bg-white/5 hover:text-white"
                >
                  <Avatar name={m.name} color={m.color} src={m.pfp} size="sm" />
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </span>

        {task.due && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/50",
              task.due < now && task.status !== "done" && "border-rose-400/30 text-rose-300"
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {fmtDue(task.due)}
          </span>
        )}

        <span className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {canEdit && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete task: ${task.title}`}
              className="flex h-5 w-5 items-center justify-center rounded text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          )}
        </span>
      </div>
    </motion.div>
  );
}
