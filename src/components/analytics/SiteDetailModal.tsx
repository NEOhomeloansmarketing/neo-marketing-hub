"use client";

import { useEffect, useState } from "react";

interface WeekRow {
  weekStart: string;
  weekEnd: string;
  visitors: number;
  visits: number;
  pageViews: number;
}

interface SiteWeeklyData {
  siteId: string;
  name: string;
  url: string;
  weeks: WeekRow[];
  periodVisitors: number;
  periodVisits: number;
  periodPageViews: number;
}

function fmtDate(ymd: string) {
  return new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pctChange(cur: number, prev: number) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function WowBadge({ cur, prev }: { cur: number; prev: number }) {
  const delta = pctChange(cur, prev);
  if (delta === null) return <span style={{ color: "#5d6566" }}>—</span>;
  const color = delta > 0 ? "#22c55e" : delta < 0 ? "#f43f5e" : "#858889";
  return <span style={{ color }} className="font-semibold tabular-nums">{delta > 0 ? "+" : ""}{delta}%</span>;
}

/** 0-100 Traffic Health Score from Duda data */
function computeHealthScore(weeks: WeekRow[]): { score: number; grade: string; color: string; breakdown: { label: string; pts: number; max: number }[] } {
  const recent = weeks.slice(-4); // last 4 weeks
  const older = weeks.slice(0, 4); // oldest 4 weeks

  const avgRecent = recent.reduce((a, w) => a + w.visitors, 0) / Math.max(recent.length, 1);
  const avgOlder = older.reduce((a, w) => a + w.visitors, 0) / Math.max(older.length, 1);

  // Volume score (0-35): log scale, 200+/week = full
  const volumeMax = 35;
  const volumePts = Math.min(volumeMax, Math.round((Math.log10(Math.max(avgRecent, 1)) / Math.log10(200)) * volumeMax));

  // Growth score (0-30): positive trend vs older weeks
  const growthMax = 30;
  let growthPts = 15; // neutral
  if (avgOlder > 0) {
    const growthPct = (avgRecent - avgOlder) / avgOlder;
    growthPts = Math.round(Math.max(0, Math.min(growthMax, 15 + growthPct * 30)));
  } else if (avgRecent > 0) {
    growthPts = growthMax; // going from 0 to something is perfect growth
  }

  // Engagement score (0-20): pageViews/visits ratio (>2 is good)
  const engagementMax = 20;
  const totalVisits = recent.reduce((a, w) => a + w.visits, 0);
  const totalPageViews = recent.reduce((a, w) => a + w.pageViews, 0);
  const ratio = totalVisits > 0 ? totalPageViews / totalVisits : 0;
  const engagementPts = Math.round(Math.min(engagementMax, (ratio / 3) * engagementMax));

  // Consistency score (0-15): weeks with any traffic
  const consistencyMax = 15;
  const activeWeeks = recent.filter((w) => w.visitors > 0).length;
  const consistencyPts = Math.round((activeWeeks / Math.max(recent.length, 1)) * consistencyMax);

  const score = volumePts + growthPts + engagementPts + consistencyPts;

  let grade = "F";
  let color = "#f43f5e";
  if (score >= 85) { grade = "A+"; color = "#22c55e"; }
  else if (score >= 75) { grade = "A"; color = "#22c55e"; }
  else if (score >= 65) { grade = "B"; color = "#84cc16"; }
  else if (score >= 50) { grade = "C"; color = "#f59e0b"; }
  else if (score >= 35) { grade = "D"; color = "#f97316"; }

  return {
    score: Math.min(100, score),
    grade,
    color,
    breakdown: [
      { label: "Traffic Volume", pts: volumePts, max: volumeMax },
      { label: "Growth Trend", pts: growthPts, max: growthMax },
      { label: "Engagement Ratio", pts: engagementPts, max: engagementMax },
      { label: "Consistency", pts: consistencyPts, max: consistencyMax },
    ],
  };
}

export function SiteDetailModal({
  siteId,
  siteName,
  siteUrl,
  onClose,
}: {
  siteId: string;
  siteName: string;
  siteUrl: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<SiteWeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/duda?mode=site-weekly&siteId=${siteId}`);
        const json = await res.json();
        setData(json);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
    // Close on Escape
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [siteId, onClose]);

  const health = data && data.weeks.length > 0 ? computeHealthScore(data.weeks) : null;
  const weeks = data?.weeks ?? [];
  const maxVisitors = Math.max(...weeks.map((w) => w.visitors), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl"
        style={{ background: "#07192e", border: "1px solid #1d4368" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368" }}>
          <div>
            <div className="text-[15px] font-bold text-slate-100">{siteName}</div>
            {siteUrl && (
              <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                className="text-[11px] transition hover:underline" style={{ color: "#5bcbf5" }}>
                {siteUrl} ↗
              </a>
            )}
          </div>
          <button onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[18px] transition hover:bg-white/10"
            style={{ color: "#858889" }}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[13px]" style={{ color: "#5d6566" }}>Loading 12 weeks of data…</div>
          </div>
        ) : (
          <div className="space-y-6 p-6">

            {/* Health Score */}
            {health && (
              <div className="rounded-xl p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                <div className="flex items-start gap-6">
                  {/* Score circle */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="relative h-20 w-20">
                      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#1d4368" strokeWidth="8" />
                        <circle cx="40" cy="40" r="32" fill="none" stroke={health.color} strokeWidth="8"
                          strokeDasharray={`${(health.score / 100) * 201} 201`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[20px] font-bold leading-none" style={{ color: health.color }}>{health.score}</span>
                        <span className="text-[10px] font-bold" style={{ color: health.color }}>{health.grade}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
                      Health Score
                    </div>
                  </div>

                  {/* Breakdown bars */}
                  <div className="flex-1 space-y-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#858889" }}>
                      Score Breakdown
                    </div>
                    {health.breakdown.map((b) => (
                      <div key={b.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px]" style={{ color: "#a8aaab" }}>{b.label}</span>
                          <span className="text-[11px] tabular-nums" style={{ color: health.color }}>{b.pts}/{b.max}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#0a2540" }}>
                          <div className="h-full rounded-full" style={{ width: `${(b.pts / b.max) * 100}%`, background: health.color }} />
                        </div>
                      </div>
                    ))}
                    <div className="pt-1 text-[10px]" style={{ color: "#5d6566" }}>
                      Based on traffic volume, 12-week growth trend, page engagement, and consistency.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 12-week chart */}
            <div className="rounded-xl p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
                12-Week Visitor Trend
              </div>
              <div className="flex items-end gap-1 h-24">
                {weeks.map((w, i) => {
                  const pct = maxVisitors > 0 ? (w.visitors / maxVisitors) * 100 : 0;
                  const prev = i > 0 ? weeks[i - 1].visitors : null;
                  const isUp = prev !== null && w.visitors > prev;
                  const isDown = prev !== null && w.visitors < prev;
                  const barColor = isUp ? "#22c55e" : isDown ? "#f43f5e" : "#5bcbf5";
                  return (
                    <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                        <div className="rounded-lg px-2 py-1.5 text-[10px] whitespace-nowrap" style={{ background: "#14375a", border: "1px solid #1d4368" }}>
                          <div className="font-semibold text-slate-100">{fmtDate(w.weekStart)} – {fmtDate(w.weekEnd)}</div>
                          <div style={{ color: "#5bcbf5" }}>{w.visitors.toLocaleString()} visitors</div>
                          <div style={{ color: "#6366f1" }}>{w.visits.toLocaleString()} visits</div>
                          <div style={{ color: "#a855f7" }}>{w.pageViews.toLocaleString()} views</div>
                        </div>
                        <div className="w-2 h-2 rotate-45 -mt-1" style={{ background: "#14375a", border: "1px solid #1d4368", borderTop: "none", borderLeft: "none" }} />
                      </div>
                      <div className="w-full rounded-t-sm transition-all duration-300"
                        style={{ height: `${Math.max(pct, 2)}%`, background: barColor, minHeight: 3 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: "#5d6566" }}>{weeks[0] ? fmtDate(weeks[0].weekStart) : ""}</span>
                <span className="text-[9px]" style={{ color: "#5d6566" }}>{weeks[weeks.length - 1] ? fmtDate(weeks[weeks.length - 1].weekStart) : ""}</span>
              </div>
              <div className="flex gap-3 mt-2">
                <span className="text-[10px] flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#22c55e" }} />Week over week gain</span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: "#5d6566" }}><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#f43f5e" }} />WoW decline</span>
              </div>
            </div>

            {/* Weekly table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889", borderBottom: "1px solid #1d4368" }}>
                Week-by-Week Data
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-[12px]" style={{ minWidth: 520 }}>
                  <thead>
                    <tr style={{ background: "#0a2540", borderBottom: "1px solid #1d4368" }}>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Week</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Visitors</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>WoW</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Visits</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Page Views</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Views/Visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...weeks].reverse().map((w, i, arr) => {
                      const prev = arr[i + 1];
                      const isLast = i === arr.length - 1;
                      const ratio = w.visits > 0 ? (w.pageViews / w.visits).toFixed(1) : "—";
                      return (
                        <tr key={w.weekStart} style={{ borderBottom: isLast ? "none" : "1px solid #0a2540" }}
                          className="hover:bg-white/[0.01]">
                          <td className="px-4 py-2.5 text-slate-100">
                            {fmtDate(w.weekStart)} – {fmtDate(w.weekEnd)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: "#5bcbf5" }}>
                            {w.visitors.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[11px]">
                            {prev ? <WowBadge cur={w.visitors} prev={prev.visitors} /> : <span style={{ color: "#5d6566" }}>—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#6366f1" }}>
                            {w.visits.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#a855f7" }}>
                            {w.pageViews.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "#858889" }}>
                            {ratio}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note on SEO score */}
            <div className="rounded-lg px-4 py-3 text-[11px]" style={{ background: "#0a2540", border: "1px dashed #1d4368", color: "#5d6566" }}>
              <span className="font-semibold" style={{ color: "#858889" }}>Want real SEO scores?</span>{" "}
              The Traffic Health Score above uses Duda traffic data only. For keyword rankings, backlink authority, and true SEO visibility per advisor site, we can integrate an API like Moz, Ahrefs, or DataForSEO. Let your admin know if you'd like this added.
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
