"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  addIdea,
  deleteIdea,
  joinPresence,
  loadIdeas,
  moveIdea,
  roleCan,
  subscribeToRoom,
  updateIdeaText,
  NOTE_COLORS,
  type IdeaNote,
  type PresenceState,
  type RoomConfig,
  type TeamMember,
} from "@/lib/room-config";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const NOTE_W = 190;
const GRID = 22;

/** Deterministic little tilt so notes look hand-placed, like FigJam. */
const tilt = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 7) - 3) * 0.6;
};

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

/** Figma-style pointer for other members' live cursors. */
function CursorGlyph({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
      <path d="M5 3l14 8-6.2 1.8L9.5 18z" fill={color} stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export default function IdeaBoardView({
  config,
  me,
}: {
  config: RoomConfig;
  me: TeamMember;
}) {
  const [notes, setNotes] = useState<IdeaNote[]>([]);
  const [cursors, setCursors] = useState<PresenceState[]>([]);
  // Camera: screen = world * zoom + (x, y)
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [nextColor, setNextColor] = useState<string>(NOTE_COLORS[0]);
  // Capability gate — mirrors the server-side `post-ideas` RLS policy.
  const canPost = roleCan(me.role, config.roles, "post-ideas");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    kind: "pan" | "note";
    id?: string;
    startX: number;
    startY: number;
    /** Current world x/y during a note drag — persisted on pointerup. */
    x?: number;
    y?: number;
  } | null>(null);
  const cursorSentRef = useRef(0);
  const editRef = useRef<HTMLTextAreaElement | null>(null);

  /* ---------- server-hosted notes (load + realtime, debounced) ---------- */
  useEffect(() => {
    let alive = true;
    let debounce: number | null = null;
    const refresh = () => {
      void loadIdeas(config.teamId).then((next) => {
        if (alive) setNotes(next);
      });
    };
    refresh();
    const onEvent = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (alive) refresh();
      }, 250);
    };
    const unsubscribe = subscribeToRoom(config.teamId, "ideas", onEvent);
    return () => {
      alive = false;
      unsubscribe();
      if (debounce) window.clearTimeout(debounce);
    };
  }, [config.teamId]);

  /* ---------- live cursors (Supabase presence) ---------- */
  const presenceRef = useRef<ReturnType<typeof joinPresence> | null>(null);
  useEffect(() => {
    const handle = joinPresence(config.teamId, (others) => setCursors(others));
    presenceRef.current = handle;
    return () => {
      handle.leave();
      presenceRef.current = null;
    };
  }, [config.teamId]);

  /* ---------- coordinate helpers ---------- */
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return {
        x: (clientX - r.left - cam.x) / cam.zoom,
        y: (clientY - r.top - cam.y) / cam.zoom,
      };
    },
    [cam]
  );

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    setCam((c) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
      const el = containerRef.current;
      if (!el) return { ...c, zoom };
      const r = el.getBoundingClientRect();
      const mx = clientX - r.left;
      const my = clientY - r.top;
      // Keep the world point under the cursor fixed while zooming.
      const wx = (mx - c.x) / c.zoom;
      const wy = (my - c.y) / c.zoom;
      return { zoom, x: mx - wx * zoom, y: my - wy * zoom };
    });
  };

  /* ---------- zoom on wheel (prevent page scroll) ---------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // zoomAt only touches refs + setCam functional updates — safe to bind once.
  }, []);

  const fitView = () => {
    if (!notes.length) {
      setCam({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of notes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NOTE_W);
      maxY = Math.max(maxY, n.y + 120);
    }
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((r.width - 80) / (maxX - minX), (r.height - 80) / (maxY - minY)))
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setCam({
      zoom,
      x: r.width / 2 - cx * zoom,
      y: r.height / 2 - cy * zoom,
    });
  };

  /* ---------- interactions ---------- */
  const beginPan = (e: ReactPointerEvent) => {
    if (editing) return;
    dragRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      x: cam.x,
      y: cam.y,
    };
  };

  const beginNoteDrag = (e: ReactPointerEvent, note: IdeaNote) => {
    if (editing === note.id) return;
    e.stopPropagation();
    setSelected(note.id);
    // Capture the pointer so fast drags keep tracking outside the canvas,
    // FigJam-style.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      kind: "note",
      id: note.id,
      startX: e.clientX,
      startY: e.clientY,
      x: note.x,
      y: note.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    // Publish my cursor via realtime presence (throttled ~60ms). e.timeStamp
    // is monotonic — keeps this handler pure for lint.
    if (e.timeStamp - cursorSentRef.current > 60) {
      cursorSentRef.current = e.timeStamp;
      const w = toWorld(e.clientX, e.clientY);
      presenceRef.current?.update({
        name: me.name,
        color: me.color,
        pfp: me.pfp,
        x: w.x,
        y: w.y,
      });
    }
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "pan") {
      d.x = d.x! + (e.clientX - d.startX);
      d.y = d.y! + (e.clientY - d.startY);
      d.startX = e.clientX;
      d.startY = e.clientY;
      setCam((c) => ({ ...c, x: d.x!, y: d.y! }));
    } else if (d.kind === "note" && d.id) {
      d.x = d.x! + (e.clientX - d.startX) / cam.zoom;
      d.y = d.y! + (e.clientY - d.startY) / cam.zoom;
      d.startX = e.clientX;
      d.startY = e.clientY;
      const nx = d.x;
      const ny = d.y;
      setNotes((prev) => prev.map((n) => (n.id === d.id ? { ...n, x: nx, y: ny } : n)));
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    if (d?.kind === "note" && d.id && d.x !== undefined && d.y !== undefined) {
      if (canPost) {
        // Persist from the drag ref itself — never from a possibly-stale render
        // closure.
        void moveIdea(config.teamId, d.id, d.x, d.y);
      }
    }
    dragRef.current = null;
  };

  const addNoteAt = async (worldX: number, worldY: number) => {
    if (!canPost) return;
    const note = await addIdea(config.teamId, {
      text: "",
      color: nextColor,
      x: worldX,
      y: worldY,
      authorId: me.id,
      authorName: me.name,
      authorColor: me.color,
      authorPfp: me.pfp,
    });
    if (!note) return;
    setNotes((prev) => [...prev, note]);
    setSelected(note.id);
    setEditing(note.id);
    setDraft("");
  };

  const addNoteCenter = () => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = toWorld(r.left + r.width / 2, r.top + r.height / 2);
    // Slight cascade so repeated adds don't stack exactly.
    const offset = notes.length % 4;
    addNoteAt(w.x + offset * 12, w.y + offset * 12);
  };

  const commitEdit = () => {
    if (!editing || !canPost) return;
    const text = draft.trim();
    void updateIdeaText(config.teamId, editing, text);
    setNotes((prev) => prev.map((n) => (n.id === editing ? { ...n, text } : n)));
    setEditing(null);
    setSelected(null);
  };

  const cancelEdit = () => {
    if (!editing) return;
    const note = notes.find((n) => n.id === editing);
    if (note && !note.text) {
      // Fresh empty note cancelled — remove it.
      void deleteIdea(config.teamId, note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    }
    setEditing(null);
    setSelected(null);
  };

  const removeNote = (id: string) => {
    if (!canPost) return;
    void deleteIdea(config.teamId, id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelected(null);
  };

  // Focus the editor when a note starts editing.
  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        const el = editRef.current;
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }
      });
    }
  }, [editing]);

  // Delete / Escape shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        removeNote(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, selected, notes]);

  const others = cursors.filter((c) => c.memberId !== me.id);

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="relative h-full w-full overflow-hidden bg-black text-white"
    >
      {/* Dotted canvas — truly infinite. The pattern stays fixed to the
          viewport and is offset by the camera modulo one grid period, so it
          wraps seamlessly at every pan/zoom without a giant element or
          float-precision drift. (A translated viewport-sized layer would show
          its edges once you pan far enough.) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: `${GRID * cam.zoom}px ${GRID * cam.zoom}px`,
          backgroundPosition: `${cam.x % (GRID * cam.zoom)}px ${cam.y % (GRID * cam.zoom)}px`,
        }}
      />

      {/* Pan layer */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onPointerDown={beginPan}
        onDoubleClick={(e) => {
          const w = toWorld(e.clientX, e.clientY);
          addNoteAt(w.x, w.y);
        }}
      />

      {/* World layer */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {notes.map((n) => {
          const isEditing = editing === n.id;
          const isSelected = selected === n.id && !isEditing;
          return (
            <div
              key={n.id}
              className={cn(
                "pointer-events-auto absolute flex flex-col rounded-lg shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] transition-shadow",
                isSelected && "shadow-[0_14px_40px_-10px_rgba(0,0,0,0.9)] ring-2 ring-white/70"
              )}
              style={{
                left: n.x,
                top: n.y,
                width: NOTE_W,
                transform: `rotate(${tilt(n.id)}deg)`,
                background: n.color,
                color: "#17171a",
              }}
              onPointerDown={(e) => beginNoteDrag(e, n)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (canPost) {
                  setEditing(n.id);
                  setDraft(n.text);
                }
              }}
            >
              {isEditing ? (
                <textarea
                  ref={editRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      commitEdit();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  placeholder="Type an idea…"
                  rows={3}
                  className="w-full resize-none bg-transparent px-3.5 pb-2 pt-3 text-[15px] leading-snug outline-none placeholder:text-black/35"
                />
              ) : (
                <p className="min-h-[4.5rem] whitespace-pre-wrap break-words px-3.5 pb-2 pt-3 text-[15px] leading-snug">
                  {n.text}
                </p>
              )}

              {/* Footer: author + delete */}
              <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/20 text-[8px] font-bold" style={{ background: n.authorColor }}>
                    {n.authorPfp ? (
                      <img src={n.authorPfp} alt="" className="h-full w-full object-cover" />
                    ) : (
                      n.authorName.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="truncate text-[10px] font-medium opacity-60">{n.authorName}</span>
                </div>
                {isSelected && canPost && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeNote(n.id)}
                    aria-label={`Delete idea: ${n.text}`}
                    className="flex h-5 w-5 items-center justify-center rounded opacity-70 transition hover:bg-black/10 hover:opacity-100"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Live cursors */}
        <AnimatePresence>
          {others.map((c) => (
            <motion.div
              key={c.memberId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute flex flex-col"
              style={{ left: c.x, top: c.y, zIndex: 50 }}
            >
              <CursorGlyph color={c.color} />
              <span
                className="mt-0.5 w-max max-w-[120px] truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-black"
                style={{ background: c.color }}
              >
                {c.name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-white/70">The board is blank</p>
            <p className="mt-1.5 text-xs text-white/40">
              Double-click anywhere to drop a sticky note.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-2 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={addNoteCenter}
          disabled={!canPost}
          className={cn(
            "flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-black transition hover:bg-neutral-200 active:scale-95",
            !canPost && "cursor-not-allowed opacity-40 hover:bg-white"
          )}
        >
          <PlusIcon className="h-3 w-3" />
          Add note
        </button>
        <div className="mx-1 h-4 w-px bg-white/10" />
        <div className="flex items-center gap-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNextColor(c)}
              aria-label={`New notes in ${c}`}
              aria-pressed={nextColor === c}
              className={cn(
                "h-5 w-5 rounded-full border transition-all",
                nextColor === c
                  ? "scale-110 border-white ring-2 ring-white/30"
                  : "border-black/20 hover:scale-105"
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Zoom HUD */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/70 p-1 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.2)}
          aria-label="Zoom out"
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          −
        </button>
        <span className="w-10 text-center font-mono text-[10px] text-white/50">
          {Math.round(cam.zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomAt(innerWidth / 2, innerHeight / 2, 1.2)}
          aria-label="Zoom in"
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          +
        </button>
        <div className="mx-0.5 h-4 w-px bg-white/10" />
        <button
          type="button"
          onClick={fitView}
          className="flex h-7 items-center rounded-full px-2.5 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
