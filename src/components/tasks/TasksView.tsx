"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface Follower {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  ownerId: string;
  ownerName: string;
  ownerColor?: string;
  ownerInitials?: string;
  projectId?: string | null;
  dueBucket?: string | null;
  dueDate?: string | null;
  status: string;
  priority: string;
  scope: string;
  followers: Follower[];
}

interface TasksViewProps {
  tasks: Task[];
  teamMembers: { id: string; name: string; color?: string; initials?: string; role: string }[];
  currentUserId: string;
  openCompose?: boolean;
  onComposeClose?: () => void;
}

const DUE_BUCKETS = [
  { id: "yesterday", label: "Overdue", tone: "#ef4444" },
  { id: "today", label: "Today", tone: "#f59e0b" },
  { id: "tomorrow", label: "Tomorrow", tone: "#5bcbf5" },
  { id: "this-week", label: "This week", tone: "#a8aaab" },
  { id: "next-week", label: "Next week", tone: "#a8aaab" },
  { id: "later", label: "Later", tone: "#858889" },
  { id: "done", label: "Recently completed", tone: "#22c55e" },
];

const PRIORITY_TONE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  HIGH: { color: "#fca5a5", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", label: "High" },
  MEDIUM: { color: "#fcd34d", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", label: "Medium" },
  LOW: { color: "#cbd5e1", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.30)", label: "Low" },
};

function PriorityChip({ priority, small }: { priority: string; small?: boolean }) {
  const t = PRIORITY_TONE[priority] || PRIORITY_TONE.LOW;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${small ? "px-2 py-[2px] text-[10px]" : "px-2.5 py-1 text-[11px]"}`}
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
      {t.label}
    </span>
  );
}

type TabType = "mine" | "team" | "all";

// ─── Rich task compose panel ───────────────────────────────────────────────
function NewTaskPanel({
  teamMembers,
  currentUserId,
  defaultScope,
  onClose,
  onCreated,
}: {
  teamMembers: TasksViewProps["teamMembers"];
  currentUserId: string;
  defaultScope: "PERSONAL" | "TEAM";
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [dueBucket, setDueBucket] = useState("today");
  const [scope, setScope] = useState<"PERSONAL" | "TEAM">(defaultScope);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) { setError("Task title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          ownerId: assigneeId || undefined,
          priority,
          dueBucket,
          dueDate: dueDate || undefined,
          scope,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Try again.");
        setSaving(false);
        return;
      }
      const task = await res.json();
      const assignee = teamMembers.find((m) => m.id === task.ownerId);
      onCreated({
        id: task.id,
        title: task.title,
        description: task.description,
        ownerId: task.ownerId,
        ownerName: task.owner?.name ?? assignee?.name ?? "",
        ownerColor: task.owner?.color ?? assignee?.color,
        ownerInitials: task.owner?.initials ?? assignee?.initials,
        projectId: task.projectId,
        dueBucket: task.dueBucket,
        dueDate: task.dueDate,
        status: task.status,
        priority: task.priority,
        scope: task.scope,
        followers: [],
      });
      onClose();
    } catch {
      setError("Network error. Check your connection.");
      setSaving(false);
    }
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} />

      {/* Panel */}
      <div
        className="relative ml-auto flex h-full w-full max-w-[560px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#061320", borderLeft: "1px solid #1d4368" }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}
        >
          <div>
            <div className="text-[16px] font-bold tracking-tight text-slate-100">New Task</div>
            <div className="mt-0.5 text-[11px]" style={{ color: "#858889" }}>Press Esc to cancel</div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.06]"
            style={{ color: "#a8aaab" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <textarea
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="Task title…"
              rows={2}
              className="w-full resize-none bg-transparent text-[22px] font-bold leading-snug tracking-tight outline-none placeholder:text-slate-600"
              style={{ color: "#f1f5f9" }}
            />
            {error && (
              <div className="mt-1 text-[11.5px] font-medium" style={{ color: "#fca5a5" }}>{error}</div>
            )}
          </div>

          {/* Two-col grid for metadata */}
          <div className="grid grid-cols-2 gap-4">

            {/* Assignee */}
            <div>
              <SectionLabel>Assignee</SectionLabel>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#e2e8f0" }}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <SectionLabel>Due date</SectionLabel>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: dueDate ? "#e2e8f0" : "#5d6566", colorScheme: "dark" }}
              />
            </div>

            {/* Priority */}
            <div>
              <SectionLabel>Priority</SectionLabel>
              <div className="flex gap-2">
                {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => {
                  const t = PRIORITY_TONE[p];
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className="flex-1 rounded-lg py-2 text-[11px] font-bold transition"
                      style={{
                        background: active ? t.bg : "#0e2b48",
                        color: active ? t.color : "#5d6566",
                        border: `1.5px solid ${active ? t.border : "#1d4368"}`,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due bucket */}
            <div>
              <SectionLabel>Schedule</SectionLabel>
              <select
                value={dueBucket}
                onChange={(e) => setDueBucket(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#e2e8f0" }}
              >
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this-week">This week</option>
                <option value="next-week">Next week</option>
                <option value="later">Later</option>
              </select>
            </div>

          </div>

          {/* Scope toggle */}
          <div>
            <SectionLabel>Visibility</SectionLabel>
            <div className="flex gap-2">
              {([["PERSONAL", "Personal (private)"], ["TEAM", "Team"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setScope(v)}
                  className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold transition"
                  style={{
                    background: scope === v ? "rgba(91,203,245,0.14)" : "#0e2b48",
                    color: scope === v ? "#5bcbf5" : "#5d6566",
                    border: `1.5px solid ${scope === v ? "rgba(91,203,245,0.45)" : "#1d4368"}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <SectionLabel>Notes / description</SectionLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, links, or details…"
              rows={5}
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-slate-600"
              style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#cbd5e1" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ borderTop: "1px solid #1d4368", background: "#0a2540" }}
        >
          <div className="text-[11px]" style={{ color: "#5d6566" }}>
            Enter a title then click Create
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[12.5px] font-semibold transition hover:bg-white/[0.04]"
              style={{ color: "#a8aaab" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="rounded-lg px-5 py-2 text-[12.5px] font-bold text-white transition disabled:opacity-40"
              style={{
                background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)",
                boxShadow: "0 4px 18px rgba(91,203,245,0.35)",
              }}
            >
              {saving ? "Creating…" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────
export function TasksView({ tasks: initialTasks, teamMembers, currentUserId, openCompose, onComposeClose }: TasksViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [tab, setTab] = useState<TabType>("mine");
  const [query, setQuery] = useState("");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    if (openCompose) setComposing(true);
  }, [openCompose]);

  const closeCompose = () => {
    setComposing(false);
    onComposeClose?.();
  };

  const toggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    const newStatus = task?.status === "DONE" ? "TODO" : "DONE";
    setTasks((ts) => ts.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (tab === "mine" && t.ownerId !== currentUserId) return false;
      if (tab === "team" && t.scope !== "TEAM") return false;
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [tasks, tab, currentUserId, query]);

  const grouped = useMemo(() => {
    return DUE_BUCKETS.map((b) => ({
      bucket: b,
      tasks: visible.filter((t) => {
        if (b.id === "done") return t.status === "DONE";
        return t.dueBucket === b.id && t.status !== "DONE";
      }),
    }));
  }, [visible]);

  const myOpen = tasks.filter((t) => t.ownerId === currentUserId && t.status !== "DONE").length;
  const teamOpen = tasks.filter((t) => t.scope === "TEAM" && t.status !== "DONE").length;
  const allOpen = tasks.filter((t) => t.status !== "DONE").length;
  const myOverdue = tasks.filter((t) => t.ownerId === currentUserId && t.status !== "DONE" && t.dueBucket === "yesterday").length;

  const TabButton = ({ t, label, count }: { t: TabType; label: string; count: number }) => (
    <button
      onClick={() => setTab(t)}
      className="relative inline-flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold transition"
      style={{ color: tab === t ? "#e2e8f0" : "#858889" }}
    >
      <span>{label}</span>
      <span
        className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
        style={{
          background: tab === t ? "rgba(91,203,245,0.18)" : "#14375a",
          color: tab === t ? "#5bcbf5" : "#a8aaab",
        }}
      >
        {count}
      </span>
      {tab === t && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "#5bcbf5" }} />
      )}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard
          span={3}
          label="My open tasks"
          value={String(myOpen)}
          delta={myOverdue > 0 ? `${myOverdue} overdue` : "On track"}
          tone={myOverdue > 0 ? "danger" : "green"}
        />
        <StatCard span={3} label="Team open" value={String(teamOpen)} delta="across team" tone="indigo" />
        <StatCard span={3} label="Completed" value={String(tasks.filter((t) => t.status === "DONE").length)} delta="total done" tone="green" />
        <StatCard span={3} label="Total tasks" value={String(allOpen)} delta="open" />
      </div>

      {/* Tabs + controls */}
      <div className="flex items-end justify-between border-b" style={{ borderColor: "#1d4368" }}>
        <div className="flex items-end gap-1">
          <TabButton t="mine" label="My Tasks" count={myOpen} />
          <TabButton t="team" label="Team Tasks" count={teamOpen} />
          <TabButton t="all" label="All Tasks" count={allOpen} />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <div
            className="flex h-8 items-center gap-2 rounded-md px-2.5"
            style={{ background: "#0a2540", border: "1px solid #1d4368", width: 220 }}
          >
            <span style={{ color: "#858889" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
              style={{ color: "#e2e8f0" }}
            />
          </div>
          <button
            onClick={() => setComposing(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.25)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New task
          </button>
        </div>
      </div>

      {/* Info banner */}
      {tab === "mine" && (
        <div
          className="flex items-start gap-3 rounded-lg p-3.5"
          style={{ background: "rgba(91,203,245,0.06)", border: "1px solid rgba(91,203,245,0.25)" }}
        >
          <div className="text-[12px] leading-relaxed" style={{ color: "#cbd5e1" }}>
            <span className="font-semibold text-slate-100">My Tasks</span> shows everything assigned to
            you — across team projects and your personal queue.
          </div>
        </div>
      )}

      {/* Sectioned list */}
      <div className="space-y-3">
        {grouped.every((g) => g.tasks.length === 0) ? (
          <EmptyState
            title="No tasks yet"
            description="Click "New task" to create your first task."
          />
        ) : (
          grouped.map(({ bucket, tasks: bucketTasks }) => {
            if (bucketTasks.length === 0) return null;
            return (
              <BucketSection
                key={bucket.id}
                bucket={bucket}
                tasks={bucketTasks}
                onToggle={toggle}
                onOpen={setOpenTask}
                defaultOpen={bucket.id !== "done"}
              />
            );
          })
        )}
      </div>

      {/* Rich new-task panel */}
      {composing && (
        <NewTaskPanel
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          defaultScope={tab === "mine" ? "PERSONAL" : "TEAM"}
          onClose={closeCompose}
          onCreated={(task) => setTasks((ts) => [task, ...ts])}
        />
      )}

      {/* Task detail drawer */}
      {openTask && (
        <TaskDetailDrawer
          task={openTask}
          teamMembers={teamMembers}
          onClose={() => setOpenTask(null)}
          onToggle={toggle}
          onUpdate={(updated) => setTasks((ts) => ts.map((t) => t.id === updated.id ? updated : t))}
        />
      )}
    </div>
  );
}

function BucketSection({
  bucket,
  tasks,
  onToggle,
  onOpen,
  defaultOpen,
}: {
  bucket: (typeof DUE_BUCKETS)[0];
  tasks: Task[];
  onToggle: (id: string) => void;
  onOpen: (t: Task) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-white/[0.02]"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: bucket.tone }} />
        <span className="text-[12.5px] font-semibold tracking-tight text-slate-100">{bucket.label}</span>
        <span className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums" style={{ background: "#14375a", color: "#a8aaab" }}>
          {tasks.length}
        </span>
        <span className="ml-auto" style={{ color: "#858889", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
      {open && (
        <div>
          <div
            className="grid items-center gap-3 px-4 py-2 text-[10.5px] font-semibold uppercase"
            style={{
              gridTemplateColumns: "20px 1fr 80px 100px 96px",
              borderBottom: "1px solid #1d4368",
              borderTop: "1px solid #1d4368",
              color: "#858889",
              background: "#0a2540",
              letterSpacing: "0.12em",
            }}
          >
            <div /><div>Task</div><div>Priority</div><div>Due</div><div>Assignee</div>
          </div>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskRow({ task, onToggle, onOpen }: { task: Task; onToggle: (id: string) => void; onOpen: (t: Task) => void }) {
  const done = task.status === "DONE";
  return (
    <div
      className="grid items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.02] cursor-pointer"
      style={{ gridTemplateColumns: "20px 1fr 80px 100px 96px", borderBottom: "1px solid #1d4368" }}
      onClick={() => onOpen(task)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
        className="grid h-5 w-5 place-items-center rounded-full transition"
        style={{ background: done ? "#22c55e22" : "transparent", border: `1.5px solid ${done ? "#22c55e" : "#5d6566"}` }}
      >
        {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </button>
      <div className="min-w-0">
        <div className={`truncate text-[13px] font-medium ${done ? "line-through" : ""}`} style={{ color: done ? "#858889" : "#e2e8f0" }}>
          {task.title}
        </div>
      </div>
      <PriorityChip priority={task.priority} small />
      <div className="text-[11px]" style={{ color: "#a8aaab" }}>
        {task.dueDate
          ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : (DUE_BUCKETS.find((b) => b.id === task.dueBucket)?.label ?? "—")}
      </div>
      <div className="flex items-center gap-1.5">
        <Avatar name={task.ownerName} color={task.ownerColor} initials={task.ownerInitials} size={22} />
        <span className="truncate text-[11px] font-medium" style={{ color: "#cbd5e1" }}>
          {task.ownerName.split(" ")[0]}
        </span>
      </div>
    </div>
  );
}

// ─── Task detail drawer ─────────────────────────────────────────────────────
function TaskDetailDrawer({
  task,
  teamMembers,
  onClose,
  onToggle,
  onUpdate,
}: {
  task: Task;
  teamMembers: TasksViewProps["teamMembers"];
  onClose: () => void;
  onToggle: (id: string) => void;
  onUpdate: (t: Task) => void;
}) {
  const done = task.status === "DONE";
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description ?? "");
  const [editAssignee, setEditAssignee] = useState(task.ownerId);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [editBucket, setEditBucket] = useState(task.dueBucket ?? "later");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    const assignee = teamMembers.find((m) => m.id === editAssignee);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          ownerId: editAssignee || undefined,
          priority: editPriority,
          dueDate: editDueDate || null,
          dueBucket: editBucket,
        }),
      });
      if (res.ok) {
        onUpdate({
          ...task,
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          ownerId: editAssignee,
          ownerName: assignee?.name ?? task.ownerName,
          ownerColor: assignee?.color ?? task.ownerColor,
          ownerInitials: assignee?.initials ?? task.ownerInitials,
          priority: editPriority,
          dueDate: editDueDate || null,
          dueBucket: editBucket,
        });
      }
    } finally {
      setSaving(false);
    }
    onClose();
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{children}</div>
  );

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
      <div
        className="relative ml-auto flex h-full w-full max-w-[540px] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#061320", borderLeft: "1px solid #1d4368" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(task.id)}
              className="grid h-6 w-6 place-items-center rounded-full transition"
              style={{ background: done ? "#22c55e22" : "transparent", border: `1.5px solid ${done ? "#22c55e" : "#858889"}` }}
            >
              {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: done ? "#86efac" : "#858889" }}>
              {done ? "Completed" : "Open"}
            </span>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/[0.06]" style={{ color: "#a8aaab" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Editable title */}
          <textarea
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            rows={2}
            className="w-full resize-none bg-transparent text-[22px] font-bold leading-snug tracking-tight outline-none"
            style={{ color: "#f1f5f9" }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionLabel>Assignee</SectionLabel>
              <select value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#e2e8f0" }}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <SectionLabel>Due date</SectionLabel>
              <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: editDueDate ? "#e2e8f0" : "#5d6566", colorScheme: "dark" }} />
            </div>
            <div>
              <SectionLabel>Priority</SectionLabel>
              <div className="flex gap-2">
                {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => {
                  const t = PRIORITY_TONE[p];
                  const active = editPriority === p;
                  return (
                    <button key={p} onClick={() => setEditPriority(p)}
                      className="flex-1 rounded-lg py-2 text-[11px] font-bold transition"
                      style={{ background: active ? t.bg : "#0e2b48", color: active ? t.color : "#5d6566", border: `1.5px solid ${active ? t.border : "#1d4368"}` }}>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <SectionLabel>Schedule</SectionLabel>
              <select value={editBucket} onChange={(e) => setEditBucket(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-[12.5px] outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#e2e8f0" }}>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this-week">This week</option>
                <option value="next-week">Next week</option>
                <option value="later">Later</option>
              </select>
            </div>
          </div>

          <div>
            <SectionLabel>Notes / description</SectionLabel>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Add context, links, or details…"
              rows={6}
              className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-slate-600"
              style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#cbd5e1" }} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid #1d4368", background: "#0a2540" }}>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12.5px] font-semibold transition hover:bg-white/[0.04]" style={{ color: "#a8aaab" }}>
            Discard
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg px-5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 18px rgba(91,203,245,0.35)" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
