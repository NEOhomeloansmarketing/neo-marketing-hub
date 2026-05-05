"use client";

import { useMemo, useState } from "react";
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
  MEDIUM: { color: "#fcd34d", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", label: "Med" },
  LOW: { color: "#cbd5e1", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.30)", label: "Low" },
};

function PriorityChip({ priority }: { priority: string }) {
  const t = PRIORITY_TONE[priority] || PRIORITY_TONE.LOW;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-semibold"
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
      {t.label}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

type TabType = "mine" | "team" | "all";

export function TasksView({ tasks: initialTasks, teamMembers, currentUserId }: TasksViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [tab, setTab] = useState<TabType>("mine");
  const [query, setQuery] = useState("");
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const toggle = async (id: string) => {
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, status: t.status === "DONE" ? "TODO" : "DONE" } : t
      )
    );
    const task = tasks.find((t) => t.id === id);
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: task?.status === "DONE" ? "TODO" : "DONE" }),
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
        <span
          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
          style={{ background: "#5bcbf5" }}
        />
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
        <StatCard span={3} label="Completed (7d)" value={String(tasks.filter((t) => t.status === "DONE").length)} delta="+2 vs prior week" tone="green" />
        <StatCard span={3} label="Total tasks" value={String(allOpen)} delta="open" />
      </div>

      {/* Tabs */}
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
            you — across team projects and your personal queue. Personal items are private and not visible to teammates.
          </div>
        </div>
      )}

      {/* Sectioned list */}
      <div className="space-y-3">
        {grouped.every((g) => g.tasks.length === 0) ? (
          <EmptyState
            title="Inbox zero"
            description="Nothing matches your filters. Try widening the scope."
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

      {/* Task detail drawer */}
      {openTask && (
        <TaskDetailDrawer
          task={openTask}
          onClose={() => setOpenTask(null)}
          onToggle={toggle}
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
    <section
      className="rounded-lg overflow-hidden"
      style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-white/[0.02]"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: bucket.tone }} />
        <span className="text-[12.5px] font-semibold tracking-tight text-slate-100">
          {bucket.label}
        </span>
        <span
          className="rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
          style={{ background: "#14375a", color: "#a8aaab" }}
        >
          {tasks.length}
        </span>
        <span
          className="ml-auto"
          style={{
            color: "#858889",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
      {open && (
        <div>
          {/* Table header */}
          <div
            className="grid items-center gap-3 px-4 py-2 text-[10.5px] font-semibold uppercase"
            style={{
              gridTemplateColumns: "20px 1fr 160px 80px 96px",
              borderBottom: "1px solid #1d4368",
              borderTop: "1px solid #1d4368",
              color: "#858889",
              background: "#0a2540",
              letterSpacing: "0.12em",
            }}
          >
            <div />
            <div>Task</div>
            <div>Project</div>
            <div>Priority</div>
            <div>Assignee</div>
          </div>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskRow({
  task,
  onToggle,
  onOpen,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onOpen: (t: Task) => void;
}) {
  const done = task.status === "DONE";
  return (
    <div
      className="grid items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.02] cursor-pointer"
      style={{
        gridTemplateColumns: "20px 1fr 160px 80px 96px",
        borderBottom: "1px solid #1d4368",
      }}
      onClick={() => onOpen(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        className="grid h-5 w-5 place-items-center rounded-full transition"
        style={{
          background: done ? "#22c55e22" : "transparent",
          border: `1.5px solid ${done ? "#22c55e" : "#5d6566"}`,
        }}
      >
        {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </button>
      <div className="min-w-0">
        <div
          className={"truncate text-[13px] font-medium " + (done ? "line-through" : "")}
          style={{ color: done ? "#858889" : "#e2e8f0" }}
        >
          {task.title}
        </div>
        {task.followers.length > 0 && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "#858889" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
            {task.followers.length} follower{task.followers.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-medium"
          style={{ background: task.scope === "PERSONAL" ? "#14375a" : "#5bcbf520", color: task.scope === "PERSONAL" ? "#a8aaab" : "#5bcbf5", border: `1px solid ${task.scope === "PERSONAL" ? "#1d4368" : "#5bcbf544"}` }}
        >
          {task.scope === "PERSONAL" ? "Personal" : task.projectId ?? "No project"}
        </span>
      </div>
      <PriorityChip priority={task.priority} />
      <div className="flex items-center gap-2">
        <Avatar name={task.ownerName} color={task.ownerColor} initials={task.ownerInitials} size={22} />
        <span className="text-[11px] font-medium" style={{ color: "#cbd5e1" }}>
          {task.ownerInitials}
        </span>
      </div>
    </div>
  );
}

function TaskDetailDrawer({
  task,
  onClose,
  onToggle,
}: {
  task: Task;
  onClose: () => void;
  onToggle: (id: string) => void;
}) {
  const done = task.status === "DONE";
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      />
      <div
        className="ml-auto h-full w-full max-w-[520px] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#0a2540", borderLeft: "1px solid #1d4368", position: "relative", zIndex: 1 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggle(task.id)}
                className="grid h-6 w-6 place-items-center rounded-full transition"
                style={{
                  background: done ? "#22c55e22" : "transparent",
                  border: `1.5px solid ${done ? "#22c55e" : "#858889"}`,
                }}
              >
                {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
              <span
                className="text-[10.5px] font-semibold uppercase"
                style={{ color: done ? "#86efac" : "#858889", letterSpacing: "0.12em" }}
              >
                {done ? "Completed" : "Open"}
              </span>
              <span
                className="rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase"
                style={{
                  background: task.scope === "PERSONAL" ? "#14375a" : "rgba(91,203,245,0.16)",
                  color: task.scope === "PERSONAL" ? "#a8aaab" : "#5bcbf5",
                  border: `1px solid ${task.scope === "PERSONAL" ? "#1d4368" : "rgba(91,203,245,0.35)"}`,
                  letterSpacing: "0.08em",
                }}
              >
                {task.scope.toLowerCase()}
              </span>
            </div>
            <h2
              className="mt-3 text-[18px] font-semibold tracking-tight text-slate-100"
              style={{ letterSpacing: "-0.01em" }}
            >
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md shrink-0"
            style={{ background: "#14375a", color: "#a8aaab" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-[120px_1fr] gap-y-3 text-[12px]">
          <dt style={{ color: "#858889" }}>Assignee</dt>
          <dd className="flex items-center gap-2">
            <Avatar name={task.ownerName} color={task.ownerColor} initials={task.ownerInitials} size={22} />
            <span className="text-slate-100">{task.ownerName}</span>
          </dd>
          <dt style={{ color: "#858889" }}>Due</dt>
          <dd className="text-slate-100">
            {DUE_BUCKETS.find((b) => b.id === task.dueBucket)?.label ?? task.dueBucket ?? "—"}
          </dd>
          <dt style={{ color: "#858889" }}>Priority</dt>
          <dd>
            <PriorityChip priority={task.priority} />
          </dd>
          {task.followers.length > 0 && (
            <>
              <dt style={{ color: "#858889" }}>Followers</dt>
              <dd className="flex items-center -space-x-1">
                {task.followers.map((f) => (
                  <span key={f.id} style={{ outline: "2px solid #0a2540", borderRadius: "999px" }}>
                    <Avatar name={f.name} color={f.color} initials={f.initials} size={22} />
                  </span>
                ))}
              </dd>
            </>
          )}
        </dl>

        {task.description && (
          <section
            className="mt-5 rounded-lg p-4"
            style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
          >
            <div
              className="text-[11px] font-semibold uppercase"
              style={{ color: "#858889", letterSpacing: "0.12em" }}
            >
              Description
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "#cbd5e1" }}>
              {task.description}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
