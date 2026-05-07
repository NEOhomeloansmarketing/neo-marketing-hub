"use client";

import Link from "next/link";

interface RequestStat {
  total: number;
  newCount: number;
  inProgress: number;
  delivered: number;
  avgCompletionDays: number | null;
  byType: { type: string; count: number }[];
  byAdvisor: { name: string; count: number }[];
  byStatus: { status: string; count: number }[];
  weeklyTrend: { label: string; count: number }[];
}

const STATUS_COLOR: Record<string, string> = {
  NEW: "#5bcbf5",
  IN_REVIEW: "#f59e0b",
  IN_PRODUCTION: "#6366f1",
  READY_FOR_REVIEW: "#a855f7",
  DELIVERED: "#22c55e",
  ARCHIVED: "#5d6566",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  IN_REVIEW: "In Review",
  IN_PRODUCTION: "In Production",
  READY_FOR_REVIEW: "Ready to Review",
  DELIVERED: "Delivered",
  ARCHIVED: "Archived",
};

const TYPE_COLORS = ["#5bcbf5", "#f59e0b", "#6366f1", "#f43f5e", "#a855f7", "#14b8a6", "#fb923c", "#22c55e", "#e879f9", "#60a5fa"];
function typeColor(type: string, i: number): string {
  return TYPE_COLORS[i % TYPE_COLORS.length];
}

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: "#0a2540" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function RequestsAnalytics({ stats }: { stats: RequestStat }) {
  const maxType = Math.max(...stats.byType.map((t) => t.count), 1);
  const maxAdvisor = Math.max(...stats.byAdvisor.map((a) => a.count), 1);
  const maxWeek = Math.max(...stats.weeklyTrend.map((w) => w.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total requests", value: stats.total, color: "#5bcbf5" },
          { label: "New / unreviewed", value: stats.newCount, color: "#f59e0b" },
          { label: "In progress", value: stats.inProgress, color: "#6366f1" },
          { label: "Delivered", value: stats.delivered, color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{s.label}</div>
            <div className="mt-1 text-[28px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Avg completion + link */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-lg px-5 py-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <span className="text-[12px]" style={{ color: "#858889" }}>Avg. completion time: </span>
          <span className="text-[14px] font-bold text-slate-100">
            {stats.avgCompletionDays !== null ? `${stats.avgCompletionDays.toFixed(1)} days` : "Not enough data"}
          </span>
        </div>
        <Link href="/requests" className="text-[12.5px] font-semibold transition hover:opacity-80" style={{ color: "#5bcbf5" }}>
          View pipeline →
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Weekly trend */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
              Requests per week (last 8 weeks)
            </div>
            <div className="flex h-40 items-end gap-2">
              {stats.weeklyTrend.map((w) => {
                const heightPct = maxWeek > 0 ? (w.count / maxWeek) * 100 : 0;
                return (
                  <div key={w.label} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max(heightPct, w.count > 0 ? 4 : 0)}%`, background: "rgba(91,203,245,0.6)", minHeight: w.count > 0 ? 4 : 0 }}
                        title={`${w.count} request${w.count !== 1 ? "s" : ""}`}
                      />
                    </div>
                    <div className="text-[9px] tabular-nums" style={{ color: "#5d6566" }}>{w.label}</div>
                    <div className="text-[10px] font-semibold" style={{ color: w.count > 0 ? "#5bcbf5" : "#5d6566" }}>{w.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>By status</div>
            <div className="space-y-3">
              {stats.byStatus.map((s) => {
                const color = STATUS_COLOR[s.status] ?? "#858889";
                const pct = stats.total > 0 ? ((s.count / stats.total) * 100).toFixed(0) : "0";
                return (
                  <div key={s.status}>
                    <div className="mb-1 flex items-center justify-between text-[11.5px]">
                      <span style={{ color }}>{STATUS_LABEL[s.status] ?? s.status}</span>
                      <span className="tabular-nums" style={{ color: "#a8aaab" }}>{s.count} <span style={{ color: "#5d6566" }}>({pct}%)</span></span>
                    </div>
                    <HBar value={s.count} max={stats.total} color={color} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* By type */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Requests by type</div>
            {stats.byType.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "#5d6566" }}>No data yet</div>
            ) : (
              <div className="space-y-3">
                {stats.byType.map((t, i) => {
                  const color = typeColor(t.type, i);
                  return (
                    <div key={t.type}>
                      <div className="mb-1 flex items-center justify-between text-[11.5px]">
                        <span style={{ color }}>{t.type || "Unknown"}</span>
                        <span className="tabular-nums font-semibold" style={{ color: "#a8aaab" }}>{t.count}</span>
                      </div>
                      <HBar value={t.count} max={maxType} color={color} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top requestors */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Top requestors</div>
            {stats.byAdvisor.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "#5d6566" }}>No data yet</div>
            ) : (
              <div className="space-y-2">
                {stats.byAdvisor.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ background: "#14375a", color: "#5bcbf5" }}>
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-[12.5px] font-medium text-slate-100">{a.name || "Unknown"}</span>
                    <span className="tabular-nums text-[12px] font-semibold" style={{ color: "#5bcbf5" }}>{a.count}</span>
                    <div className="w-24">
                      <HBar value={a.count} max={maxAdvisor} color="#5bcbf5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
