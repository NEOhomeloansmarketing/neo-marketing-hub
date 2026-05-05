"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Chip } from "@/components/ui/Chip";
import { StatCard } from "@/components/ui/StatCard";

interface Attendee {
  id: string;
  name: string;
  color?: string;
  initials?: string;
}

interface MeetingRow {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  recurrence: string;
  status: string;
  attendees: Attendee[];
  actionCount: number;
  actionsDone: number;
  summary?: string;
  seriesColor?: string;
  seriesName?: string;
}

interface MeetingsListProps {
  meetings: MeetingRow[];
  stats: {
    totalThisMonth: number;
    openActions: number;
    avgDuration: number;
    onTimeRate: number;
  };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function RecurrencePill({ recurrence }: { recurrence: string }) {
  const label =
    recurrence === "ONE_OFF"
      ? "One-off"
      : recurrence === "WEEKLY"
        ? "Weekly"
        : recurrence === "BIWEEKLY"
          ? "Bi-weekly"
          : "Monthly";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[3px] text-[10.5px] font-medium"
      style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
    >
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    COMPLETED: { bg: "#22c55e22", color: "#86efac", label: "Completed" },
    IN_PROGRESS: { bg: "#f59e0b22", color: "#fcd34d", label: "In progress" },
    UPCOMING: { bg: "#5bcbf522", color: "#5bcbf5", label: "Upcoming" },
  };
  const s = map[status] || map.UPCOMING;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[3px] text-[10.5px] font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44` }}
    >
      {s.label}
    </span>
  );
}

export function MeetingsList({ meetings, stats }: MeetingsListProps) {
  const [query, setQuery] = useState("");

  const filtered = meetings.filter(
    (m) =>
      !query ||
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      (m.summary || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-12 gap-3">
        <StatCard span={3} label="Meetings this month" value={String(stats.totalThisMonth)} delta="+3 vs last month" />
        <StatCard span={3} label="Open action items" value={String(stats.openActions)} delta="across all meetings" tone="indigo" />
        <StatCard span={3} label="Avg duration" value={`${stats.avgDuration}m`} delta="minutes per meeting" tone="green" />
        <StatCard span={3} label="On-time start rate" value={`${stats.onTimeRate}%`} delta="+4 pts" tone="green" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex h-9 items-center gap-2 rounded-md px-2.5"
          style={{ background: "#0a2540", border: "1px solid #1d4368", width: 280 }}
        >
          <span style={{ color: "#858889" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, decisions, summaries…"
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
            style={{ color: "#e2e8f0" }}
          />
        </div>
        <Link
          href="/meetings/new"
          className="ml-auto flex h-9 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-white"
          style={{ background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.30)" }}
        >
          + New meeting
        </Link>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-lg"
        style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
      >
        {/* Header */}
        <div
          className="grid items-center gap-3 px-4 py-2.5 text-[10.5px] font-semibold uppercase"
          style={{
            gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 1fr 1fr 24px",
            borderBottom: "1px solid #1d4368",
            color: "#858889",
            background: "#0a2540",
            letterSpacing: "0.12em",
          }}
        >
          <div>Meeting</div>
          <div>Recurrence</div>
          <div>Date · Time</div>
          <div>Attendees</div>
          <div>Action items</div>
          <div>Status</div>
          <div />
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-[13px]" style={{ color: "#858889" }}>
            No meetings found.{" "}
            <Link href="/meetings/new" style={{ color: "#5bcbf5" }}>
              Create one.
            </Link>
          </div>
        ) : (
          filtered.map((m, i) => (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              className="grid w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
              style={{
                gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 1fr 1fr 24px",
                borderBottom: i === filtered.length - 1 ? "none" : "1px solid #1d4368",
                display: "grid",
              }}
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-slate-100">
                  {m.title}
                </div>
                {m.summary && (
                  <div
                    className="mt-0.5 truncate text-[11.5px]"
                    style={{ color: "#858889" }}
                  >
                    {m.summary}
                  </div>
                )}
              </div>
              <RecurrencePill recurrence={m.recurrence} />
              <div className="text-[12px]" style={{ color: "#cbd5e1" }}>
                <div>{formatDate(m.scheduledAt)}</div>
                <div className="text-[11px]" style={{ color: "#858889" }}>
                  {formatTime(m.scheduledAt)} · {m.durationMinutes}m
                </div>
              </div>
              <AvatarStack people={m.attendees} max={4} size={22} />
              <div className="pr-2">
                <ProgressBar done={m.actionsDone} total={m.actionCount} />
              </div>
              <StatusPill status={m.status} />
              <div style={{ color: "#858889" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
