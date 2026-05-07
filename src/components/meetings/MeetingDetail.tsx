"use client";

import { useState } from "react";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(iso: string, durationMinutes: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function SectionBlock({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg p-4"
      style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className="text-[12px] font-semibold uppercase"
          style={{ color: "#858889", letterSpacing: "0.12em" }}
        >
          {title}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function ActionItemRow({
  item,
  onToggle,
  onConvertToTask,
}: {
  item: ActionItem;
  onToggle: (id: string) => void;
  onConvertToTask: (id: string) => void;
}) {
  const done = item.status === "DONE";
  return (
    <div
      className="group flex items-start gap-2.5 rounded-md p-2.5 transition hover:bg-white/[0.02]"
      style={{ background: "#0a2540", border: "1px solid #1d4368" }}
    >
      <button
        onClick={() => onToggle(item.id)}
        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full transition"
        style={{
          background: done ? "#22c55e" : "transparent",
          border: `1.5px solid ${done ? "#22c55e" : "#5d6566"}`,
        }}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={"text-[12.5px] " + (done ? "line-through" : "")}
          style={{ color: done ? "#858889" : "#e2e8f0" }}
        >
          {item.title}
        </div>
        <div
          className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]"
          style={{ color: "#858889" }}
        >
          {item.assignee && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={item.assignee.name} color={item.assignee.color} initials={item.assignee.initials} size={14} />
              {item.assignee.name}
            </span>
          )}
          {item.dueDate && (
            <span className="inline-flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Due {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          {item.source === "MEETING" && !item.taskId && (
            <span
              className="text-[10px] font-medium uppercase"
              style={{ color: "#5bcbf5", letterSpacing: "0.08em" }}
            >
              AI extracted
            </span>
          )}
          {item.taskId && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: "#22c55e" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Task created
            </span>
          )}
        </div>
      </div>
      {!item.taskId && (
        <button
          onClick={() => onConvertToTask(item.id)}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium opacity-0 transition group-hover:opacity-100"
          style={{ background: "#14375a", color: "#5bcbf5", border: "1px solid #1d4368" }}
          title="Convert to task"
        >
          → Task
        </button>
      )}
    </div>
  );
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
  const [actionItems, setActionItems] = useState(meeting.actionItems);
  const [addingAction, setAddingAction] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCreateTask, setNewCreateTask] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const toggleAction = async (id: string) => {
    setActionItems((items) =>
      items.map((a) =>
        a.id === id ? { ...a, status: a.status === "DONE" ? "OPEN" : "DONE" } : a
      )
    );
    const item = actionItems.find((a) => a.id === id);
    if (!item) return;
    await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: item.status === "DONE" ? "OPEN" : "DONE" }),
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
      setActionItems((items) =>
        items.map((a) => (a.id === id ? { ...a, taskId: updated.taskId } : a))
      );
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAddLoading(true);
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        meetingId: meeting.id,
        assigneeId: newAssigneeId || undefined,
        dueDate: newDueDate || undefined,
        createTask: newCreateTask,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      const assignee = meeting.attendees.find((a) => a.id === newAssigneeId) ?? null;
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
      setNewTitle("");
      setNewAssigneeId("");
      setNewDueDate("");
      setNewCreateTask(false);
      setAddingAction(false);
    }
    setAddLoading(false);
  };

  const handleExtractAI = async () => {
    setExtracting(true);
    const res = await fetch(`/api/meetings/${meeting.id}/extract-actions`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.created?.length) {
        setActionItems((prev) => [...prev, ...data.created]);
      }
    }
    setExtracting(false);
  };

  const attended = meeting.attendees.filter((a) => !a.absent);
  const absent = meeting.attendees.filter((a) => a.absent);

  return (
    <div className="space-y-5">
      {/* Back */}
      <div>
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium transition hover:text-slate-200"
          style={{ color: "#a8aaab" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(180deg)" }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Back to all meetings
        </Link>
      </div>

      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-[3px] text-[10.5px] font-medium"
            style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
          >
            {meeting.recurrence === "ONE_OFF"
              ? "One-off"
              : meeting.recurrence === "WEEKLY"
                ? "Recurring · Weekly"
                : meeting.recurrence === "BIWEEKLY"
                  ? "Recurring · Bi-weekly"
                  : "Recurring · Monthly"}
          </span>
        </div>
        <h2
          className="mt-2 text-[22px] font-semibold tracking-tight text-slate-100"
          style={{ letterSpacing: "-0.01em" }}
        >
          {meeting.title}
        </h2>
        <div
          className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]"
          style={{ color: "#a8aaab" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(meeting.scheduledAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTimeRange(meeting.scheduledAt, meeting.durationMinutes)} · {meeting.durationMinutes}m
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
            {attended.length} attended{absent.length > 0 ? `, ${absent.length} absent` : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Main column */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {/* Summary */}
          {meeting.summary && (
            <SectionBlock
              title="Summary"
              right={
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold"
                  style={{ background: "#5bcbf522", color: "#5bcbf5", border: "1px solid #5bcbf544" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L9.5 8.5 3 9.27l5 4.87L6.18 21 12 17.77 17.82 21 16 14.14l5-4.87-6.5-.77L12 2z" />
                  </svg>
                  AI generated
                </span>
              }
            >
              <p className="text-[13px] leading-relaxed" style={{ color: "#cbd5e1" }}>
                {meeting.summary}
              </p>
            </SectionBlock>
          )}

          {/* Attendees */}
          <SectionBlock title="Attendees">
            <div className="flex flex-wrap gap-2">
              {attended.map((p) => (
                <div
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5"
                  style={{ background: "#0a2540", border: "1px solid #1d4368" }}
                >
                  <Avatar name={p.name} color={p.color} initials={p.initials} size={20} />
                  <span className="text-[12px] font-medium text-slate-200">{p.name}</span>
                </div>
              ))}
              {absent.map((p) => (
                <div
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 opacity-60"
                  style={{ background: "#0a2540", border: "1px dashed #1d4368" }}
                >
                  <Avatar name={p.name} color={p.color} initials={p.initials} size={20} />
                  <span className="text-[12px] font-medium" style={{ color: "#858889" }}>
                    {p.name} · absent
                  </span>
                </div>
              ))}
            </div>
          </SectionBlock>

          {/* Discussion notes / sections */}
          {meeting.sections.length > 0 && (
            <SectionBlock title="Discussion notes">
              <div className="space-y-3">
                {[...meeting.sections]
                  .sort((a, b) => a.position - b.position)
                  .map((s, idx) => (
                    <div
                      key={s.id}
                      className="rounded-md p-3"
                      style={{ background: "#0a2540", border: "1px solid #1d4368" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold"
                          style={{ background: "#14375a", color: "#a8aaab" }}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-[13px] font-semibold text-slate-100">
                          {s.heading}
                        </span>
                      </div>
                      {s.bodyMd && (
                        <p
                          className="mt-2 text-[12.5px] leading-relaxed whitespace-pre-wrap"
                          style={{ color: "#cbd5e1" }}
                        >
                          {s.bodyMd}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </SectionBlock>
          )}

          {/* Decisions */}
          {meeting.decisions.length > 0 && (
            <SectionBlock title="Decisions">
              <ul className="space-y-2">
                {meeting.decisions.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start gap-2 text-[13px]"
                    style={{ color: "#cbd5e1" }}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "#5bcbf5" }}
                    />
                    {d.body}
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}
        </div>

        {/* Right rail — action items */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <SectionBlock
            title="Action items"
            right={
              <button
                onClick={() => setAddingAction(true)}
                className="text-[11px] font-semibold transition hover:opacity-80"
                style={{ color: "#5bcbf5" }}
              >
                + Add
              </button>
            }
          >
            {actionItems.length === 0 && !addingAction ? (
              <p className="text-[12px] text-center py-4" style={{ color: "#858889" }}>
                No action items yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {actionItems.map((a) => (
                  <ActionItemRow key={a.id} item={a} onToggle={toggleAction} onConvertToTask={convertToTask} />
                ))}
              </div>
            )}

            {/* Add action item form */}
            {addingAction && (
              <form
                onSubmit={handleAddAction}
                className="mt-3 space-y-2 rounded-md p-3"
                style={{ background: "#0a2540", border: "1px solid #1d4368" }}
              >
                <input
                  autoFocus
                  placeholder="Action item title…"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={inputStyle}
                />
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  style={{ ...inputStyle, color: newAssigneeId ? "#e2e8f0" : "#858889" }}
                >
                  <option value="">Assign to… (optional)</option>
                  {meeting.attendees.filter((a) => !a.absent).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  style={{ ...inputStyle, color: newDueDate ? "#e2e8f0" : "#858889" }}
                />
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newCreateTask}
                    onChange={(e) => setNewCreateTask(e.target.checked)}
                    className="rounded"
                    style={{ accentColor: "#5bcbf5" }}
                  />
                  <span className="text-[11.5px]" style={{ color: "#a8aaab" }}>Also create a task</span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={addLoading || !newTitle.trim()}
                    className="flex-1 rounded py-1.5 text-[11.5px] font-semibold transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: "#5bcbf5", color: "#0a2540" }}
                  >
                    {addLoading ? "Saving…" : "Add item"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingAction(false);
                      setNewTitle("");
                      setNewAssigneeId("");
                      setNewDueDate("");
                      setNewCreateTask(false);
                    }}
                    className="rounded px-3 py-1.5 text-[11.5px] font-medium transition hover:brightness-110"
                    style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Extract with AI */}
            <button
              onClick={handleExtractAI}
              disabled={extracting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md py-2 text-[12px] font-semibold transition hover:brightness-110 disabled:opacity-60"
              style={{
                background: "rgba(91,203,245,0.08)",
                border: "1px dashed rgba(91,203,245,0.4)",
                color: "#5bcbf5",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.5 8.5 3 9.27l5 4.87L6.18 21 12 17.77 17.82 21 16 14.14l5-4.87-6.5-.77L12 2z" />
              </svg>
              {extracting ? "Extracting…" : "Extract action items with AI"}
            </button>
          </SectionBlock>
        </div>
      </div>
    </div>
  );
}
