"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

interface Person {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  role?: string;
}

interface ActionItem {
  id: string;
  title: string;
  assignee?: Person | null;
  dueDate?: string | null;
  status: string;
  source: string;
  taskId?: string | null;
}

interface Section {
  id: string;
  heading: string;
  bodyMd: string;
  position: number;
}

interface Decision {
  id: string;
  body: string;
}

interface MeetingDetailProps {
  meeting: {
    id: string;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    recurrence: string;
    status: string;
    sections: Section[];
    decisions: Decision[];
    actionItems: ActionItem[];
    attendees: (Person & { absent?: boolean })[];
    summary?: string;
  };
}

function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const inputStyle: React.CSSProperties = {
  background: "#0a2540",
  border: "1px solid #1d4368",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 12,
  padding: "6px 10px",
  width: "100%",
  outline: "none",
};

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  const [status, setStatus] = useState(meeting.status);
  const [sections, setSections] = useState<Section[]>(
    [...meeting.sections].sort((a, b) => a.position - b.position)
  );
  const [decisions, setDecisions] = useState<Decision[]>(meeting.decisions);
  const [actionItems, setActionItems] = useState(meeting.actionItems);

  // Active section index for focused mode
  const [activeIdx, setActiveIdx] = useState(0);

  // Editing state for active section
  const activeSection = sections[activeIdx] ?? null;
  const [editHeading, setEditHeading] = useState(activeSection?.heading ?? "");
  const [editBody, setEditBody] = useState(activeSection?.bodyMd ?? "");

  const debouncedHeading = useDebounce(editHeading, 800);
  const debouncedBody = useDebounce(editBody, 800);
  const lastSavedRef = useRef<{ heading: string; body: string }>({ heading: "", body: "" });
  const [savingSection, setSavingSection] = useState(false);

  // Sync editable fields when active section changes
  useEffect(() => {
    setEditHeading(activeSection?.heading ?? "");
    setEditBody(activeSection?.bodyMd ?? "");
    lastSavedRef.current = { heading: activeSection?.heading ?? "", body: activeSection?.bodyMd ?? "" };
  }, [activeIdx, activeSection?.id]);

  // Auto-save section edits
  useEffect(() => {
    if (!activeSection) return;
    if (
      debouncedHeading === lastSavedRef.current.heading &&
      debouncedBody === lastSavedRef.current.body
    ) return;
    setSavingSection(true);
    fetch(`/api/meetings/${meeting.id}/sections/${activeSection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heading: debouncedHeading, bodyMd: debouncedBody }),
    }).then(() => {
      setSections((prev) =>
        prev.map((s) =>
          s.id === activeSection.id
            ? { ...s, heading: debouncedHeading, bodyMd: debouncedBody }
            : s
        )
      );
      lastSavedRef.current = { heading: debouncedHeading, body: debouncedBody };
      setSavingSection(false);
    });
  }, [debouncedHeading, debouncedBody, activeSection, meeting.id]);

  // Timer
  const isLive = status === "IN_PROGRESS";
  const timer = useTimer(isLive);

  // Start / end meeting
  const startMeeting = async () => {
    setStatus("IN_PROGRESS");
    await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
  };

  const endMeeting = async () => {
    setStatus("COMPLETED");
    await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
  };

  // Add section
  const addSection = async () => {
    const pos = sections.length;
    const res = await fetch(`/api/meetings/${meeting.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heading: "New item", bodyMd: "", position: pos }),
    });
    if (res.ok) {
      const s = await res.json();
      setSections((prev) => [...prev, s]);
      setActiveIdx(pos);
    }
  };

  // Delete section
  const deleteSection = async (id: string) => {
    await fetch(`/api/meetings/${meeting.id}/sections/${id}`, { method: "DELETE" });
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next;
    });
    setActiveIdx((i) => Math.min(i, sections.length - 2));
  };

  // Move section up/down
  const moveSection = async (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const reindexed = next.map((s, i) => ({ ...s, position: i }));
    setSections(reindexed);
    setActiveIdx(swap);
    await Promise.all(
      reindexed.map((s) =>
        fetch(`/api/meetings/${meeting.id}/sections/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: s.position }),
        })
      )
    );
  };

  // Action items
  const [addingAction, setAddingAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionAssigneeId, setNewActionAssigneeId] = useState("");
  const [newActionDueDate, setNewActionDueDate] = useState("");
  const [newActionCreateTask, setNewActionCreateTask] = useState(false);
  const [addActionLoading, setAddActionLoading] = useState(false);

  const toggleAction = async (id: string) => {
    const item = actionItems.find((a) => a.id === id);
    if (!item) return;
    const newStatus = item.status === "DONE" ? "OPEN" : "DONE";
    setActionItems((items) => items.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const convertToTask = async (id: string) => {
    const res = await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convertToTask: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setActionItems((items) => items.map((a) => (a.id === id ? { ...a, taskId: updated.taskId } : a)));
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;
    setAddActionLoading(true);
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newActionTitle.trim(),
        meetingId: meeting.id,
        assigneeId: newActionAssigneeId || undefined,
        dueDate: newActionDueDate || undefined,
        createTask: newActionCreateTask,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      const assignee = meeting.attendees.find((a) => a.id === newActionAssigneeId) ?? null;
      setActionItems((prev) => [
        ...prev,
        {
          id: created.id,
          title: created.title,
          assignee: assignee ? { id: assignee.id, name: assignee.name, color: assignee.color, initials: assignee.initials } : null,
          dueDate: created.dueDate ?? null,
          status: created.status,
          source: created.source,
          taskId: created.taskId ?? null,
        },
      ]);
      setNewActionTitle("");
      setNewActionAssigneeId("");
      setNewActionDueDate("");
      setNewActionCreateTask(false);
      setAddingAction(false);
    }
    setAddActionLoading(false);
  };

  // Decisions
  const [newDecision, setNewDecision] = useState("");
  const [addingDecision, setAddingDecision] = useState(false);

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecision.trim()) return;
    const res = await fetch(`/api/meetings/${meeting.id}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newDecision.trim() }),
    });
    if (res.ok) {
      const d = await res.json();
      setDecisions((prev) => [...prev, d]);
      setNewDecision("");
      setAddingDecision(false);
    }
  };

  const deleteDecision = async (id: string) => {
    await fetch(`/api/meetings/${meeting.id}/decisions/${id}`, { method: "DELETE" });
    setDecisions((prev) => prev.filter((d) => d.id !== id));
  };

  // Extract AI
  const [extracting, setExtracting] = useState(false);
  const handleExtractAI = async () => {
    setExtracting(true);
    const res = await fetch(`/api/meetings/${meeting.id}/extract-actions`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.created?.length) setActionItems((prev) => [...prev, ...data.created]);
    }
    setExtracting(false);
  };

  const attended = meeting.attendees.filter((a) => !a.absent);

  const statusColor = status === "COMPLETED" ? "#22c55e" : status === "IN_PROGRESS" ? "#5bcbf5" : "#858889";
  const statusLabel = status === "COMPLETED" ? "Completed" : status === "IN_PROGRESS" ? "In progress" : "Upcoming";

  return (
    <div className="flex h-full flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3 mb-4"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/meetings"
            className="shrink-0 grid h-7 w-7 place-items-center rounded-md transition hover:bg-white/[0.06]"
            style={{ color: "#a8aaab", border: "1px solid #1d4368" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold text-slate-100">{meeting.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
              <span className="text-[11px]" style={{ color: statusColor }}>{statusLabel}</span>
              <span className="text-[11px]" style={{ color: "#5d6566" }}>·</span>
              <span className="text-[11px]" style={{ color: "#858889" }}>
                {new Date(meeting.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Attendee avatars */}
          <div className="hidden sm:flex -space-x-1.5">
            {attended.slice(0, 5).map((p) => (
              <Avatar key={p.id} name={p.name} color={p.color} initials={p.initials} size={24} />
            ))}
            {attended.length > 5 && (
              <div className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold" style={{ background: "#14375a", color: "#a8aaab", border: "2px solid #0e2b48" }}>
                +{attended.length - 5}
              </div>
            )}
          </div>

          {/* Timer */}
          {isLive && (
            <div
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[13px] font-bold tabular-nums"
              style={{ background: "rgba(91,203,245,0.12)", border: "1px solid rgba(91,203,245,0.3)", color: "#5bcbf5" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#5bcbf5" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#5bcbf5" }} />
              </span>
              {timer}
            </div>
          )}

          {/* Start / End */}
          {status === "UPCOMING" && (
            <button
              onClick={startMeeting}
              className="rounded-lg px-4 py-2 text-[12.5px] font-bold transition hover:brightness-110"
              style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", color: "#061320" }}
            >
              Start meeting
            </button>
          )}
          {status === "IN_PROGRESS" && (
            <button
              onClick={endMeeting}
              className="rounded-lg px-4 py-2 text-[12.5px] font-bold transition hover:brightness-110"
              style={{ background: "#14375a", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              End meeting
            </button>
          )}
          {status === "COMPLETED" && (
            <span className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
              Meeting complete
            </span>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Agenda sidebar ──────────────────────────────────────── */}
        <div
          className="hidden lg:flex w-56 shrink-0 flex-col rounded-xl overflow-hidden"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <div
            className="px-4 py-3 text-[10.5px] font-semibold uppercase tracking-widest shrink-0"
            style={{ color: "#858889", borderBottom: "1px solid #1d4368" }}
          >
            Agenda
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sections.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveIdx(idx)}
                className="group flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition"
                style={{
                  background: idx === activeIdx ? "rgba(91,203,245,0.08)" : "transparent",
                  borderLeft: `2px solid ${idx === activeIdx ? "#5bcbf5" : "transparent"}`,
                }}
              >
                <span
                  className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{
                    background: idx === activeIdx ? "#5bcbf5" : "#14375a",
                    color: idx === activeIdx ? "#061320" : "#a8aaab",
                    minWidth: 18,
                    height: 18,
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  className="truncate text-[12px] font-medium leading-snug"
                  style={{ color: idx === activeIdx ? "#e2e8f0" : "#a8aaab" }}
                >
                  {s.heading || "Untitled"}
                </span>
              </button>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #1d4368" }} className="shrink-0 p-2">
            <button
              onClick={addSection}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[11.5px] font-semibold transition hover:brightness-110"
              style={{ color: "#5bcbf5", background: "rgba(91,203,245,0.08)" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add agenda item
            </button>
          </div>
        </div>

        {/* ── Active section editor ───────────────────────────────── */}
        <div className="flex flex-1 flex-col rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368", minWidth: 0 }}>
          {sections.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
              <div className="text-[14px] font-semibold text-slate-300">No agenda items yet</div>
              <p className="text-[12px]" style={{ color: "#858889" }}>Add items to structure your meeting.</p>
              <button
                onClick={addSection}
                className="mt-2 rounded-lg px-4 py-2 text-[12.5px] font-bold transition hover:brightness-110"
                style={{ background: "rgba(91,203,245,0.12)", color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.3)" }}
              >
                + Add first agenda item
              </button>
            </div>
          ) : activeSection ? (
            <>
              {/* Section nav header */}
              <div
                className="flex shrink-0 items-center justify-between px-5 py-3"
                style={{ borderBottom: "1px solid #1d4368" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold"
                    style={{ background: "#5bcbf5", color: "#061320" }}
                  >
                    {activeIdx + 1}
                  </span>
                  <span className="text-[11px]" style={{ color: "#858889" }}>
                    of {sections.length} agenda items
                  </span>
                  {savingSection && (
                    <span className="text-[10.5px]" style={{ color: "#5d6566" }}>Saving…</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSection(activeIdx, -1)}
                    disabled={activeIdx === 0}
                    className="grid h-6 w-6 place-items-center rounded transition hover:bg-white/[0.06] disabled:opacity-30"
                    title="Move up"
                    style={{ color: "#a8aaab" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveSection(activeIdx, 1)}
                    disabled={activeIdx === sections.length - 1}
                    className="grid h-6 w-6 place-items-center rounded transition hover:bg-white/[0.06] disabled:opacity-30"
                    title="Move down"
                    style={{ color: "#a8aaab" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteSection(activeSection.id)}
                    className="ml-1 grid h-6 w-6 place-items-center rounded transition hover:bg-red-500/10"
                    title="Delete item"
                    style={{ color: "#5d6566" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editable content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <input
                  value={editHeading}
                  onChange={(e) => setEditHeading(e.target.value)}
                  placeholder="Agenda item title…"
                  className="w-full bg-transparent text-[22px] font-bold tracking-tight outline-none placeholder:text-slate-600"
                  style={{ color: "#f1f5f9" }}
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Notes, talking points, key context…"
                  className="w-full flex-1 resize-none rounded-lg bg-transparent p-0 text-[13.5px] leading-relaxed outline-none placeholder:text-slate-600"
                  style={{ color: "#cbd5e1", minHeight: 200 }}
                  rows={12}
                />
              </div>

              {/* Prev / Next navigation */}
              <div
                className="flex shrink-0 items-center justify-between px-5 py-3"
                style={{ borderTop: "1px solid #1d4368" }}
              >
                <button
                  onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                  disabled={activeIdx === 0}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition hover:bg-white/[0.04] disabled:opacity-30"
                  style={{ color: "#a8aaab" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Previous
                </button>
                {/* Mobile: section list dropdown */}
                <div className="flex lg:hidden items-center gap-1.5">
                  {sections.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIdx(idx)}
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: idx === activeIdx ? 20 : 8,
                        background: idx === activeIdx ? "#5bcbf5" : "#1d4368",
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActiveIdx((i) => Math.min(sections.length - 1, i + 1))}
                  disabled={activeIdx === sections.length - 1}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition hover:bg-white/[0.04] disabled:opacity-30"
                  style={{ color: activeIdx === sections.length - 1 ? "#5d6566" : "#5bcbf5" }}
                >
                  Next
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* ── Right rail ──────────────────────────────────────────── */}
        <div className="hidden xl:flex w-64 shrink-0 flex-col gap-4">

          {/* Action items */}
          <div
            className="flex flex-col rounded-xl overflow-hidden"
            style={{ background: "#0e2b48", border: "1px solid #1d4368", maxHeight: "55%" }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid #1d4368" }}
            >
              <div className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>
                Action items
              </div>
              <button
                onClick={() => setAddingAction(true)}
                className="text-[11px] font-semibold"
                style={{ color: "#5bcbf5" }}
              >
                + Add
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {actionItems.length === 0 && !addingAction && (
                <p className="py-4 text-center text-[11.5px]" style={{ color: "#5d6566" }}>None yet</p>
              )}
              {actionItems.map((a) => {
                const done = a.status === "DONE";
                return (
                  <div
                    key={a.id}
                    className="group flex items-start gap-2 rounded-md p-2 transition hover:bg-white/[0.02]"
                    style={{ background: "#0a2540", border: "1px solid #1d4368" }}
                  >
                    <button
                      onClick={() => toggleAction(a.id)}
                      className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition"
                      style={{ background: done ? "#22c55e" : "transparent", border: `1.5px solid ${done ? "#22c55e" : "#5d6566"}` }}
                    >
                      {done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={"truncate text-[11.5px] " + (done ? "line-through" : "")} style={{ color: done ? "#5d6566" : "#e2e8f0" }}>
                        {a.title}
                      </div>
                      {a.assignee && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "#858889" }}>
                          <Avatar name={a.assignee.name} color={a.assignee.color} initials={a.assignee.initials} size={12} />
                          {a.assignee.name}
                        </div>
                      )}
                    </div>
                    {!a.taskId && (
                      <button
                        onClick={() => convertToTask(a.id)}
                        className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium opacity-0 transition group-hover:opacity-100"
                        style={{ background: "#14375a", color: "#5bcbf5", border: "1px solid #1d4368" }}
                      >
                        → Task
                      </button>
                    )}
                  </div>
                );
              })}

              {addingAction && (
                <form onSubmit={handleAddAction} className="space-y-2 rounded-md p-2" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
                  <input autoFocus placeholder="Action item…" value={newActionTitle} onChange={(e) => setNewActionTitle(e.target.value)} style={inputStyle} />
                  <select value={newActionAssigneeId} onChange={(e) => setNewActionAssigneeId(e.target.value)} style={{ ...inputStyle, color: newActionAssigneeId ? "#e2e8f0" : "#858889" }}>
                    <option value="">Assign to… (optional)</option>
                    {meeting.attendees.filter((a) => !a.absent).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <input type="date" value={newActionDueDate} onChange={(e) => setNewActionDueDate(e.target.value)} style={{ ...inputStyle, color: newActionDueDate ? "#e2e8f0" : "#858889" }} />
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={newActionCreateTask} onChange={(e) => setNewActionCreateTask(e.target.checked)} style={{ accentColor: "#5bcbf5" }} />
                    <span className="text-[10.5px]" style={{ color: "#a8aaab" }}>Also create task</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button type="submit" disabled={addActionLoading || !newActionTitle.trim()} className="flex-1 rounded py-1 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50" style={{ background: "#5bcbf5", color: "#0a2540" }}>
                      {addActionLoading ? "…" : "Add"}
                    </button>
                    <button type="button" onClick={() => setAddingAction(false)} className="rounded px-2 py-1 text-[11px] font-medium" style={{ background: "#14375a", color: "#a8aaab" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="shrink-0 p-3" style={{ borderTop: "1px solid #1d4368" }}>
              <button
                onClick={handleExtractAI}
                disabled={extracting}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold transition hover:brightness-110 disabled:opacity-60"
                style={{ background: "rgba(91,203,245,0.08)", border: "1px dashed rgba(91,203,245,0.35)", color: "#5bcbf5" }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 8.5 3 9.27l5 4.87L6.18 21 12 17.77 17.82 21 16 14.14l5-4.87-6.5-.77L12 2z" /></svg>
                {extracting ? "Extracting…" : "Extract with AI"}
              </button>
            </div>
          </div>

          {/* Decisions */}
          <div
            className="flex flex-col rounded-xl overflow-hidden flex-1"
            style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
          >
            <div
              className="flex shrink-0 items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid #1d4368" }}
            >
              <div className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>
                Decisions
              </div>
              <button
                onClick={() => setAddingDecision(true)}
                className="text-[11px] font-semibold"
                style={{ color: "#5bcbf5" }}
              >
                + Log
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {decisions.length === 0 && !addingDecision && (
                <p className="py-4 text-center text-[11.5px]" style={{ color: "#5d6566" }}>No decisions logged</p>
              )}
              {decisions.map((d) => (
                <div
                  key={d.id}
                  className="group flex items-start gap-2 rounded-md p-2.5"
                  style={{ background: "#0a2540", border: "1px solid #1d4368" }}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#5bcbf5" }} />
                  <p className="flex-1 text-[11.5px] leading-snug" style={{ color: "#cbd5e1" }}>{d.body}</p>
                  <button
                    onClick={() => deleteDecision(d.id)}
                    className="shrink-0 opacity-0 transition group-hover:opacity-100"
                    style={{ color: "#5d6566" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              {addingDecision && (
                <form onSubmit={handleAddDecision} className="space-y-2">
                  <textarea
                    autoFocus
                    value={newDecision}
                    onChange={(e) => setNewDecision(e.target.value)}
                    placeholder="We decided to…"
                    rows={2}
                    style={{ ...inputStyle, resize: "none" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddDecision(e as unknown as React.FormEvent);
                    }}
                  />
                  <div className="flex gap-1.5">
                    <button type="submit" disabled={!newDecision.trim()} className="flex-1 rounded py-1 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50" style={{ background: "#5bcbf5", color: "#0a2540" }}>Log</button>
                    <button type="button" onClick={() => setAddingDecision(false)} className="rounded px-2 py-1 text-[11px] font-medium" style={{ background: "#14375a", color: "#a8aaab" }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
