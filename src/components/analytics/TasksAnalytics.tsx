"use client";

import { useEffect, useState } from "react";

// ─── AI Weekly Summary card ────────────────────────────────────────────────
export interface WeeklySummaryData {
  id: string;
  prose: string;
  highlights: string[];
  generatedAt: string;
}

function AISummaryCard({ initialSummary }: { initialSummary: WeeklySummaryData | null }) {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate on Fridays if no summary exists yet
  useEffect(() => {
    const isFriday = new Date().getDay() === 5;
    if (isFriday && !initialSummary) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics/weekly-summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Generation failed"); return; }
      setSummary(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isFriday = new Date().getDay() === 5;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #071828 0%, #0a2540 100%)", border: "1px solid rgba(91,203,245,0.2)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(91,203,245,0.15)", background: "rgba(91,203,245,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[16px]">✨</span>
          <div>
            <div className="text-[13px] font-bold text-slate-100">AI Weekly Summary</div>
            <div className="text-[10.5px]" style={{ color: "#5d6566" }}>
              {summary
                ? `Generated ${new Date(summary.generatedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                : isFriday ? "Generating your Friday wrap-up…" : "No summary yet for this week"}
            </div>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110 disabled:opacity-50"
          style={{ background: "rgba(91,203,245,0.12)", color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.25)" }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
              Generating…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              {summary ? "Regenerate" : "Generate"}
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {error && (
          <div className="mb-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        {loading && !summary && (
          <div className="flex items-center gap-3 py-4">
            <svg className="animate-spin shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
            <span className="text-[12.5px]" style={{ color: "#858889" }}>Claude is writing your team's weekly wrap-up…</span>
          </div>
        )}

        {!summary && !loading && (
          <div className="py-4 text-center">
            <p className="text-[12.5px] mb-3" style={{ color: "#858889" }}>
              {isFriday
                ? "It's Friday — generate this week's AI summary to celebrate your team's work!"
                : "Click Generate to create an AI-written summary of this week's accomplishments."}
            </p>
            <button
              onClick={generate}
              className="rounded-lg px-4 py-2 text-[12.5px] font-semibold transition hover:brightness-110"
              style={{ background: "rgba(91,203,245,0.12)", color: "#5bcbf5", border: "1px solid rgba(91,203,245,0.25)" }}
            >
              ✨ Generate summary
            </button>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-3 gap-5">
            {/* Prose — 2/3 */}
            <div className="col-span-2 space-y-3">
              {summary.prose.split("\n\n").map((para, i) => (
                <p key={i} className="text-[13px] leading-relaxed" style={{ color: "#cbd5e1" }}>{para}</p>
              ))}
            </div>
            {/* Highlights — 1/3 */}
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#5bcbf5" }}>Highlights</div>
              <ul className="space-y-2">
                {summary.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug" style={{ color: "#e2e8f0" }}>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export interface TasksAnalyticsStats {
  weekLabel: string; // e.g. "Jun 9 – Jun 15, 2026"
  completedThisWeek: number;
  completedLastWeek: number;
  totalOpen: number;
  overdue: number;
  highPriorityOpen: number;
  byPerson: {
    id: string;
    name: string;
    color?: string;
    initials?: string;
    completedThisWeek: number;
    open: number;
    overdue: number;
    completedTasks: { id: string; title: string; priority: string; completedAt: string }[];
  }[];
  weeklyTrend: { label: string; completed: number; created: number }[];
  priorityBreakdown: { priority: string; completed: number; open: number }[];
  dueSoon: { id: string; title: string; ownerName: string; dueDate: string; priority: string }[];
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
};
const PRIORITY_BG: Record<string, string> = {
  HIGH: "rgba(239,68,68,0.12)",
  MEDIUM: "rgba(245,158,11,0.12)",
  LOW: "rgba(34,197,94,0.10)",
};

function Avatar({ name, color, initials, size = 28 }: { name: string; color?: string; initials?: string; size?: number }) {
  const bg = color ?? "#14375a";
  const text = initials ?? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="shrink-0 rounded-full grid place-items-center font-bold"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35, color: "#fff" }}
    >
      {text}
    </div>
  );
}

function StatBox({ label, value, sub, tone = "default" }: { label: string; value: string | number; sub?: string; tone?: "green" | "red" | "amber" | "blue" | "default" }) {
  const tones: Record<string, { bg: string; border: string; val: string }> = {
    green:   { bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.2)",  val: "#22c55e" },
    red:     { bg: "rgba(239,68,68,0.07)",    border: "rgba(239,68,68,0.2)", val: "#ef4444" },
    amber:   { bg: "rgba(245,158,11,0.07)",   border: "rgba(245,158,11,0.2)",val: "#f59e0b" },
    blue:    { bg: "rgba(91,203,245,0.07)",   border: "rgba(91,203,245,0.2)",val: "#5bcbf5" },
    default: { bg: "#0e2b48",                 border: "#1d4368",              val: "#e2e8f0" },
  };
  const t = tones[tone];
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <div className="text-[10.5px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{label}</div>
      <div className="text-[28px] font-black tabular-nums leading-none" style={{ color: t.val }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: "#5d6566" }}>{sub}</div>}
    </div>
  );
}

function TrendBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[10px] tabular-nums font-semibold" style={{ color: "#a8aaab" }}>{value}</div>
      <div className="w-7 rounded-t flex flex-col justify-end" style={{ height: 60, background: "#0a2540" }}>
        <div className="w-full rounded-t transition-all" style={{ height: `${pct}%`, background: color, minHeight: value > 0 ? 3 : 0 }} />
      </div>
    </div>
  );
}

function WeeklyChart({ trend }: { trend: TasksAnalyticsStats["weeklyTrend"] }) {
  const maxVal = Math.max(...trend.flatMap((w) => [w.completed, w.created]), 1);
  return (
    <div>
      <div className="flex items-end gap-3 pt-2 pb-1">
        {trend.map((w) => (
          <div key={w.label} className="flex flex-col items-center gap-0.5 flex-1">
            <div className="flex items-end gap-0.5 w-full justify-center">
              <TrendBar value={w.completed} max={maxVal} color="#22c55e" />
              <TrendBar value={w.created} max={maxVal} color="#5bcbf5" />
            </div>
            <div className="text-[9px] text-center" style={{ color: "#5d6566" }}>{w.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: "#22c55e" }} />
          <span className="text-[11px]" style={{ color: "#858889" }}>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: "#5bcbf5" }} />
          <span className="text-[11px]" style={{ color: "#858889" }}>Created</span>
        </div>
      </div>
    </div>
  );
}

export function TasksAnalytics({ stats, initialSummary }: { stats: TasksAnalyticsStats; initialSummary: WeeklySummaryData | null }) {
  const { weekLabel, completedThisWeek, completedLastWeek, totalOpen, overdue, highPriorityOpen, byPerson, weeklyTrend, priorityBreakdown, dueSoon } = stats;
  const delta = completedThisWeek - completedLastWeek;
  const activeMembers = byPerson.filter((p) => p.completedThisWeek > 0 || p.open > 0);

  return (
    <div className="space-y-6">

      {/* AI Summary */}
      <AISummaryCard initialSummary={initialSummary} />

      {/* Week header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "#5bcbf5" }}>Weekly Team Report</div>
          <div className="text-[22px] font-black tracking-tight text-slate-100">{weekLabel}</div>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-3.5 py-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-[13px] font-bold" style={{ color: "#22c55e" }}>{completedThisWeek} tasks completed this week</span>
          {delta !== 0 && (
            <span className="text-[11px] font-semibold" style={{ color: delta > 0 ? "#22c55e" : "#f59e0b" }}>
              ({delta > 0 ? "+" : ""}{delta} vs last week)
            </span>
          )}
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Completed this week" value={completedThisWeek} sub={`${completedLastWeek} last week`} tone="green" />
        <StatBox label="Total open" value={totalOpen} sub="across all team members" tone="blue" />
        <StatBox label="Overdue" value={overdue} sub="need attention" tone={overdue > 0 ? "red" : "default"} />
        <StatBox label="High priority open" value={highPriorityOpen} sub="urgent tasks remaining" tone={highPriorityOpen > 0 ? "amber" : "default"} />
      </div>

      {/* Main content: team accomplishments + trend */}
      <div className="grid grid-cols-3 gap-4">

        {/* Team accomplishments — 2/3 width */}
        <div className="col-span-2 rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
            <div className="text-[13px] font-bold text-slate-100">Team Accomplishments</div>
            <div className="text-[11px]" style={{ color: "#5d6566" }}>Tasks completed this week</div>
          </div>
          {byPerson.filter((p) => p.completedThisWeek > 0).length === 0 ? (
            <div className="py-10 text-center text-[12.5px]" style={{ color: "#5d6566" }}>
              No tasks completed yet this week — check back later!
            </div>
          ) : (
            <div className="divide-y" style={{ divideColor: "#1d4368" }}>
              {byPerson
                .filter((p) => p.completedThisWeek > 0)
                .sort((a, b) => b.completedThisWeek - a.completedThisWeek)
                .map((person) => (
                  <div key={person.id} className="px-5 py-4">
                    {/* Person header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <Avatar name={person.name} color={person.color} initials={person.initials} size={30} />
                      <div className="flex-1">
                        <div className="text-[13px] font-bold text-slate-100">{person.name}</div>
                        <div className="text-[10.5px]" style={{ color: "#5d6566" }}>
                          {person.open > 0 ? `${person.open} still open` : "All clear"}
                          {person.overdue > 0 ? ` · ${person.overdue} overdue` : ""}
                        </div>
                      </div>
                      <div
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
                      >
                        ✓ {person.completedThisWeek}
                      </div>
                    </div>
                    {/* Completed task list */}
                    <div className="space-y-1.5 pl-9">
                      {person.completedTasks.map((t) => (
                        <div key={t.id} className="flex items-start gap-2">
                          <span
                            className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: PRIORITY_COLOR[t.priority] ?? "#5d6566" }}
                          />
                          <span className="text-[12px] leading-snug line-through" style={{ color: "#858889" }}>
                            {t.title}
                          </span>
                          <span className="ml-auto shrink-0 text-[10px]" style={{ color: "#5d6566" }}>
                            {new Date(t.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Weekly trend chart */}
          <div className="rounded-xl p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[12px] font-bold text-slate-100 mb-3">8-Week Trend</div>
            <WeeklyChart trend={weeklyTrend} />
          </div>

          {/* Priority breakdown */}
          <div className="rounded-xl p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[12px] font-bold text-slate-100 mb-3">Completed by Priority</div>
            <div className="space-y-2.5">
              {priorityBreakdown.map((p) => (
                <div key={p.priority} className="flex items-center gap-2.5">
                  <span
                    className="w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold"
                    style={{ background: PRIORITY_BG[p.priority], color: PRIORITY_COLOR[p.priority] }}
                  >
                    {p.priority[0] + p.priority.slice(1).toLowerCase()}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#0a2540" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(p.completed / Math.max(p.completed + p.open, 1)) * 100}%`,
                        background: PRIORITY_COLOR[p.priority],
                      }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums font-semibold" style={{ color: "#a8aaab" }}>
                    {p.completed}<span style={{ color: "#5d6566" }}>/{p.completed + p.open}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Member summary table */}
      {activeMembers.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
            <div className="text-[13px] font-bold text-slate-100">Team Summary</div>
          </div>
          <div>
            {/* Header */}
            <div
              className="grid px-5 py-2 text-[10.5px] font-semibold uppercase tracking-widest"
              style={{ gridTemplateColumns: "1fr 100px 80px 80px 80px", color: "#5d6566", borderBottom: "1px solid #1d4368", background: "#071828" }}
            >
              <div>Team Member</div>
              <div className="text-center">✓ This Week</div>
              <div className="text-center">Open</div>
              <div className="text-center">Overdue</div>
              <div className="text-center">Progress</div>
            </div>
            {activeMembers
              .sort((a, b) => b.completedThisWeek - a.completedThisWeek)
              .map((p, i) => {
                const total = p.completedThisWeek + p.open;
                const pct = total > 0 ? Math.round((p.completedThisWeek / total) * 100) : 0;
                return (
                  <div
                    key={p.id}
                    className="grid items-center px-5 py-3"
                    style={{ gridTemplateColumns: "1fr 100px 80px 80px 80px", borderBottom: i < activeMembers.length - 1 ? "1px solid #1d4368" : "none" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.name} color={p.color} initials={p.initials} size={26} />
                      <span className="text-[13px] font-semibold text-slate-100">{p.name}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[14px] font-bold" style={{ color: p.completedThisWeek > 0 ? "#22c55e" : "#5d6566" }}>
                        {p.completedThisWeek}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[13px] font-semibold" style={{ color: "#a8aaab" }}>{p.open}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[13px] font-semibold" style={{ color: p.overdue > 0 ? "#ef4444" : "#5d6566" }}>
                        {p.overdue > 0 ? p.overdue : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#0a2540" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: pct >= 75 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#5bcbf5" }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums w-7 text-right" style={{ color: "#5d6566" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
            <div className="text-[13px] font-bold text-slate-100">Due Next 7 Days</div>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              {dueSoon.length} tasks
            </span>
          </div>
          <div className="divide-y" style={{ divideColor: "#1d4368" }}>
            {dueSoon.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: PRIORITY_COLOR[t.priority] ?? "#5d6566" }}
                />
                <span className="flex-1 truncate text-[12.5px]" style={{ color: "#cbd5e1" }}>{t.title}</span>
                <span className="text-[11px]" style={{ color: "#a8aaab" }}>{t.ownerName.split(" ")[0]}</span>
                <span
                  className="rounded px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ background: "#0a2540", color: "#f59e0b", border: "1px solid #1d4368" }}
                >
                  {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
