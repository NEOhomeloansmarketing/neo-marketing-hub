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

export function ActionItemsBoard({ items, stats }: ActionItemsBoardProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [query, setQuery] = useState("");

  const filtered = items.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (query && !a.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    await fetch(`/api/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Open" value={String(stats.open)} delta="across all meetings" tone="indigo" />
        <StatCard span={3} label="Due this week" value={String(stats.dueThisWeek)} delta="needs attention" />
        <StatCard span={3} label="Completed" value={String(stats.completed)} delta="this month" tone="green" />
        <StatCard span={3} label="Avg time-to-close" value={`${stats.avgDays}d`} delta="days" tone="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "OPEN", "IN_PROGRESS", "DONE", "BLOCKED"] as FilterStatus[]).map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
            {s === "ALL" ? "All" : STATUS_MAP[s]?.label ?? s}
          </Chip>
        ))}
        <div
          className="ml-auto flex h-9 items-center gap-2 rounded-md px-2.5"
          style={{ background: "#0a2540", border: "1px solid #1d4368", width: 260 }}
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
      </div>

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
