"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/StatCard";
import { Chip } from "@/components/ui/Chip";

interface Person {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface ActionItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: Person | null;
  dueDate?: string | null;
  meetingId?: string | null;
  meetingTitle?: string | null;
  source: string;
  createdAt: string;
}

interface ActionItemsBoardProps {
  items: ActionItem[];
  stats: {
    open: number;
    dueThisWeek: number;
    completed: number;
    avgDays: number;
  };
}

type FilterStatus = "ALL" | "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  OPEN: { bg: "#5bcbf522", color: "#5bcbf5", label: "Open" },
  IN_PROGRESS: { bg: "#f59e0b22", color: "#fcd34d", label: "In progress" },
  DONE: { bg: "#22c55e22", color: "#86efac", label: "Done" },
  BLOCKED: { bg: "#ef444422", color: "#fca5a5", label: "Blocked" },
};

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  HIGH: { color: "#fca5a5", label: "High" },
  MEDIUM: { color: "#fcd34d", label: "Med" },
  LOW: { color: "#94a3b8", label: "Low" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.OPEN;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[3px] text-[10px] font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44` }}
    >
      {s.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.MEDIUM;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-semibold"
      style={{
        background: `${p.color}20`,
        color: p.color,
        border: `1px solid ${p.color}44`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
      {p.label}
    </span>
  );
}

export function ActionItemsBoard({ items: initialItems, stats: initialStats }: ActionItemsBoardProps) {
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");

  const stats = {
    open: items.filter((a) => a.status !== "DONE").length,
    dueThisWeek: (() => {
      const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return items.filter((a) => a.dueDate && new Date(a.dueDate) <= weekEnd && a.status !== "DONE").length;
    })(),
    completed: items.filter((a) => a.status === "DONE").length,
    avgDays: initialStats.avgDays,
  };

  const filtered = items.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (query && !a.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    setItems((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const handleAddAction = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), priority: newPriority }),
      });
      if (res.ok) {
        const action = await res.json();
        setItems((prev) => [
          {
            id: action.id,
            title: action.title,
            status: action.status,
            priority: action.priority,
            assignee: action.assignee ?? null,
            dueDate: action.dueDate ?? null,
            meetingId: null,
            meetingTitle: null,
            source: action.source,
            createdAt: action.createdAt,
          },
          ...prev,
        ]);
      }
    } catch { /* silently fail */ }
    setNewTitle("");
    setComposing(false);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Open" value={String(stats.open)} delta="across all meetings" tone="indigo" />
        <StatCard span={3} label="Due this week" value={String(stats.dueThisWeek)} delta="needs attention" />
        <StatCard span={3} label="Completed" value={String(stats.completed)} delta="this month" tone="green" />
        <StatCard span={3} label="Avg time-to-close" value={`${initialStats.avgDays}d`} delta="days" tone="green" />
      </div>

      {/* Filters + New button */}
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "OPEN", "IN_PROGRESS", "DONE", "BLOCKED"] as FilterStatus[]).map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {s === "ALL" ? "All" : STATUS_MAP[s]?.label ?? s}
          </Chip>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex h-9 items-center gap-2 rounded-md px-2.5"
            style={{ background: "#0a2540", border: "1px solid #1d4368", width: 240 }}
          >
            <span style={{ color: "#858889" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search action items…"
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
              style={{ color: "#e2e8f0" }}
            />
          </div>
          <button
            onClick={() => setComposing(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
            style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.25)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New action
          </button>
        </div>
      </div>

      {/* Compose form */}
      {composing && (
        <div className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid rgba(91,203,245,0.45)" }}>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddAction(); if (e.key === "Escape") setComposing(false); }}
            placeholder="Action item title…"
            className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-slate-500"
            style={{ color: "#e2e8f0" }}
          />
          <div className="mt-3 flex items-center gap-2">
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
              className="h-7 rounded-md px-2 text-[11px] outline-none"
              style={{ background: "#14375a", border: "1px solid #1d4368", color: "#cbd5e1" }}>
              <option value="HIGH">High priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="LOW">Low priority</option>
            </select>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setComposing(false)} className="rounded-md px-3 py-1.5 text-[11.5px] font-medium"
                style={{ background: "#14375a", color: "#cbd5e1", border: "1px solid #1d4368" }}>Cancel</button>
              <button onClick={handleAddAction} disabled={!newTitle.trim()} className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)" }}>Add action</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-hidden rounded-lg"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        <div
          className="grid items-center gap-3 px-4 py-2.5 text-[10.5px] font-semibold uppercase"
          style={{
            gridTemplateColumns: "1fr 140px 100px 100px 120px",
            borderBottom: "1px solid #1d4368",
            color: "#858889",
            background: "#0a2540",
            letterSpacing: "0.12em",
          }}
        >
          <div>Action item</div>
          <div>Assignee</div>
          <div>Due</div>
          <div>Priority</div>
          <div>Status</div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-[13px]" style={{ color: "#858889" }}>
            No action items found.
          </div>
        ) : (
          filtered.map((a, i) => (
            <div
              key={a.id}
              className="grid items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02]"
              style={{
                gridTemplateColumns: "1fr 140px 100px 100px 120px",
                borderBottom: i === filtered.length - 1 ? "none" : "1px solid #1d4368",
              }}
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-slate-100">
                  {a.title}
                </div>
                {a.meetingId && a.meetingTitle && (
                  <Link
                    href={`/meetings/${a.meetingId}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] hover:underline"
                    style={{ color: "#858889" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    {a.meetingTitle}
                  </Link>
                )}
              </div>
              <div>
                {a.assignee ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar
                      name={a.assignee.name}
                      color={a.assignee.color}
                      initials={a.assignee.initials}
                      size={22}
                    />
                    <span className="text-[11.5px] font-medium" style={{ color: "#cbd5e1" }}>
                      {a.assignee.name.split(" ")[0]}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px]" style={{ color: "#5d6566" }}>
                    Unassigned
                  </span>
                )}
              </div>
              <div className="text-[11.5px]" style={{ color: "#a8aaab" }}>
                {a.dueDate
                  ? new Date(a.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : <span style={{ color: "#5d6566" }}>—</span>}
              </div>
              <PriorityDot priority={a.priority} />
              <div>
                <select
                  value={a.status}
                  onChange={(e) => handleStatusChange(a.id, e.target.value)}
                  className="rounded-md px-1.5 py-1 text-[11px] font-semibold outline-none"
                  style={{
                    background: STATUS_MAP[a.status]?.bg ?? "#14375a",
                    color: STATUS_MAP[a.status]?.color ?? "#a8aaab",
                    border: `1px solid ${STATUS_MAP[a.status]?.color ?? "#1d4368"}44`,
                  }}
                >
                  {Object.entries(STATUS_MAP).map(([v, s]) => (
                    <option key={v} value={v} style={{ background: "#0a2540", color: "#e2e8f0" }}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
