"use client";

import { useEffect, useState } from "react";
import { SiteDetailModal } from "./SiteDetailModal";

interface SiteStats {
  siteId: string;
  name: string;
  url: string;
  visitors: number;
  visits: number;
  pageViews: number;
  prevVisitors: number;
  prevVisits: number;
  prevPageViews: number;
  visitorsDelta: number;
}

interface Totals {
  visitors: number;
  visits: number;
  pageViews: number;
  prevVisitors: number;
  prevVisits: number;
  prevPageViews: number;
}

interface AnalyticsData {
  sites: SiteStats[];
  totals: Totals;
  dateRange: { start: string; end: string; prevStart: string; prevEnd: string };
}

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
];

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function fmtDate(ymd: string) {
  return new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function pctDelta(current: number, prev: number) {
  if (!prev) return null;
  return Math.round(((current - prev) / prev) * 100);
}

function StatCard({ label, value, prev, color }: { label: string; value: number; prev: number; color: string }) {
  const delta = pctDelta(value, prev);
  return (
    <div className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{label}</div>
      <div className="mt-1 text-[26px] font-bold tabular-nums leading-none" style={{ color }}>{value.toLocaleString()}</div>
      {delta !== null && (
        <div className="mt-1.5 text-[11px] font-semibold" style={{ color: delta >= 0 ? "#22c55e" : "#f43f5e" }}>
          {delta >= 0 ? "+" : ""}{delta}% vs prev period
        </div>
      )}
    </div>
  );
}

function MiniBar({ value, max, color = "#5bcbf5" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#0a2540" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function WoWPill({ current, prev }: { current: number; prev: number }) {
  const delta = pctDelta(current, prev);
  if (delta === null) return <span className="text-[10px]" style={{ color: "#5d6566" }}>—</span>;
  const color = delta > 0 ? "#22c55e" : delta < 0 ? "#f43f5e" : "#858889";
  return (
    <span className="inline-flex items-center rounded-full px-1.5 py-[1px] text-[10px] font-semibold tabular-nums"
      style={{ background: color + "20", color }}>
      {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta)}%
    </span>
  );
}

type SortKey = "visitors" | "visits" | "pageViews" | "visitorsDelta" | "name";

export function DudaAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState(30);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("visitors");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedSite, setSelectedSite] = useState<{ siteId: string; name: string; url: string } | null>(null);

  useEffect(() => { fetchData(30); }, []);

  async function fetchData(days: number, start?: string, end?: string) {
    setLoading(true); setError("");
    try {
      const e = end ?? toYMD(new Date());
      const s = start ?? (() => { const d = new Date(); d.setDate(d.getDate() - days); return toYMD(d); })();
      const res = await fetch(`/api/duda?start=${s}&end=${e}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  function applyPreset(days: number) {
    setPreset(days); setUseCustom(false);
    fetchData(days);
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    setUseCustom(true);
    fetchData(0, customStart, customEnd);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="text-[13px]" style={{ color: "#5d6566" }}>Fetching stats for all 103 Matrix sites…</div>
      <div className="text-[11px]" style={{ color: "#5d6566" }}>This may take 15–20 seconds</div>
    </div>
  );

  if (error) return (
    <div className="rounded-lg p-5 text-center" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      <div className="text-[13px]" style={{ color: "#f43f5e" }}>Error: {error}</div>
      <div className="mt-1 text-[11px]" style={{ color: "#5d6566" }}>Make sure DUDA_API_USER and DUDA_API_KEY are set in Vercel environment variables.</div>
    </div>
  );

  if (!data) return null;

  const { sites, totals, dateRange } = data;
  const maxVisitors = Math.max(...sites.map((s) => s.visitors), 1);

  const filtered = sites
    .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.url.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });

  const activeSites = sites.filter((s) => s.visitors > 0).length;

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none hover:opacity-80"
        style={{ color: active ? "#5bcbf5" : "#858889" }}
        onClick={() => toggleSort(k)}>
        {label} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </th>
    );
  }

  // Period-over-period totals deltas
  const totalVisitorsDelta = pctDelta(totals.visitors, totals.prevVisitors);
  const totalVisitsDelta = pctDelta(totals.visits, totals.prevVisits);
  const totalPageViewsDelta = pctDelta(totals.pageViews, totals.prevPageViews);

  return (
    <div className="space-y-6">

      {/* Site Detail Modal */}
      {selectedSite && (
        <SiteDetailModal
          siteId={selectedSite.siteId}
          siteName={selectedSite.name}
          siteUrl={selectedSite.url}
          onClose={() => setSelectedSite(null)}
        />
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] font-semibold text-slate-100">
          103 Matrix Sites
          <span className="ml-2 text-[11px] font-normal" style={{ color: "#5d6566" }}>
            {activeSites} with traffic in period
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button key={p.days} onClick={() => applyPreset(p.days)}
              className="rounded-md px-3 py-1.5 text-[12px] font-semibold transition"
              style={!useCustom && preset === p.days
                ? { background: "#14375a", color: "#5bcbf5", border: "1px solid #1d4368" }
                : { background: "#0e2b48", color: "#858889", border: "1px solid #1d4368" }}>
              {p.label}
            </button>
          ))}
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-md px-2 py-1.5 text-[12px] text-slate-100 outline-none"
            style={{ background: "#0e2b48", border: `1px solid ${useCustom ? "#5bcbf5" : "#1d4368"}` }} />
          <span style={{ color: "#5d6566" }} className="text-[11px]">to</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-md px-2 py-1.5 text-[12px] text-slate-100 outline-none"
            style={{ background: "#0e2b48", border: `1px solid ${useCustom ? "#5bcbf5" : "#1d4368"}` }} />
          <button onClick={applyCustom} disabled={!customStart || !customEnd}
            className="rounded-md px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-40"
            style={{ background: "#5bcbf5", color: "#061320" }}>Apply</button>
        </div>
      </div>

      <div className="text-[11.5px]" style={{ color: "#5d6566" }}>
        {fmtDate(dateRange.start)} – {fmtDate(dateRange.end)} · compared to {fmtDate(dateRange.prevStart)} – {fmtDate(dateRange.prevEnd)}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Visitors" value={totals.visitors} prev={totals.prevVisitors} color="#5bcbf5" />
        <StatCard label="Total Visits" value={totals.visits} prev={totals.prevVisits} color="#6366f1" />
        <StatCard label="Page Views" value={totals.pageViews} prev={totals.prevPageViews} color="#a855f7" />
        <div className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Active Sites</div>
          <div className="mt-1 text-[26px] font-bold tabular-nums leading-none" style={{ color: "#22c55e" }}>{activeSites}</div>
          <div className="mt-1.5 text-[11px]" style={{ color: "#5d6566" }}>of 103 total</div>
        </div>
      </div>

      {/* Period-over-period summary row */}
      <div className="rounded-lg px-5 py-3 flex flex-wrap gap-6" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
        <div className="flex items-center gap-2 text-[12px]">
          <span style={{ color: "#858889" }}>Visitors vs prev:</span>
          {totalVisitorsDelta !== null
            ? <span className="font-semibold" style={{ color: totalVisitorsDelta >= 0 ? "#22c55e" : "#f43f5e" }}>
                {totalVisitorsDelta >= 0 ? "+" : ""}{totalVisitorsDelta}%
              </span>
            : <span style={{ color: "#5d6566" }}>—</span>}
          <span className="text-[11px]" style={{ color: "#5d6566" }}>({totals.prevVisitors.toLocaleString()} prev)</span>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span style={{ color: "#858889" }}>Visits vs prev:</span>
          {totalVisitsDelta !== null
            ? <span className="font-semibold" style={{ color: totalVisitsDelta >= 0 ? "#22c55e" : "#f43f5e" }}>
                {totalVisitsDelta >= 0 ? "+" : ""}{totalVisitsDelta}%
              </span>
            : <span style={{ color: "#5d6566" }}>—</span>}
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span style={{ color: "#858889" }}>Page Views vs prev:</span>
          {totalPageViewsDelta !== null
            ? <span className="font-semibold" style={{ color: totalPageViewsDelta >= 0 ? "#22c55e" : "#f43f5e" }}>
                {totalPageViewsDelta >= 0 ? "+" : ""}{totalPageViewsDelta}%
              </span>
            : <span style={{ color: "#5d6566" }}>—</span>}
        </div>
      </div>

      {/* Top 10 bar chart — clickable */}
      <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
            Top 10 Sites by Visitors
          </div>
          <div className="text-[10px]" style={{ color: "#5d6566" }}>Click any row to drill in →</div>
        </div>
        <div className="space-y-2.5 mt-4">
          {sites.slice(0, 10).map((s, i) => {
            const delta = pctDelta(s.visitors, s.prevVisitors);
            return (
              <div key={s.siteId}
                className="cursor-pointer rounded-lg px-3 py-2 -mx-3 transition hover:bg-white/[0.03]"
                onClick={() => setSelectedSite({ siteId: s.siteId, name: s.name, url: s.url })}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold tabular-nums w-4 shrink-0" style={{ color: "#5d6566" }}>#{i + 1}</span>
                    <span className="text-[12.5px] font-medium text-slate-100 truncate">{s.name}</span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] shrink-0 transition hover:underline" style={{ color: "#5d6566" }}
                        onClick={(e) => e.stopPropagation()}>↗</a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0 ml-2">
                    <span style={{ color: "#5bcbf5" }}>{s.visitors.toLocaleString()} visitors</span>
                    {delta !== null && (
                      <span className="font-semibold" style={{ color: delta >= 0 ? "#22c55e" : "#f43f5e" }}>
                        {delta >= 0 ? "+" : ""}{delta}%
                      </span>
                    )}
                    <span className="text-[10px] rounded-full px-1.5 py-[1px]" style={{ background: "#14375a", color: "#5bcbf5" }}>Details →</span>
                  </div>
                </div>
                <MiniBar value={s.visitors} max={maxVisitors} color="#5bcbf5" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Full table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        {/* Search */}
        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #1d4368" }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider flex-1" style={{ color: "#858889" }}>
            All Sites
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search advisor or site…"
            className="rounded-md px-3 py-1.5 text-[12px] text-slate-100 outline-none"
            style={{ background: "#0a2540", border: "1px solid #1d4368", width: 220 }}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#0a2540", borderBottom: "1px solid #1d4368" }}>
                <SortTh label="Advisor / Site" k="name" />
                <SortTh label="Visitors" k="visitors" />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>WoW</th>
                <SortTh label="Visits" k="visits" />
                <SortTh label="Page Views" k="pageViews" />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Views/Visit</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Site</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const isLast = i === filtered.length - 1;
                const ratio = s.visits > 0 ? (s.pageViews / s.visits).toFixed(1) : "—";
                return (
                  <tr key={s.siteId} style={{ borderBottom: isLast ? "none" : "1px solid #0a2540" }}
                    className="hover:bg-white/[0.01] transition cursor-pointer"
                    onClick={() => setSelectedSite({ siteId: s.siteId, name: s.name, url: s.url })}>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-100">{s.name}</td>
                    <td className="px-4 py-3 text-[13px] font-bold tabular-nums" style={{ color: "#5bcbf5" }}>
                      {s.visitors.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <WoWPill current={s.visitors} prev={s.prevVisitors} />
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: "#6366f1" }}>
                      {s.visits.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: "#a855f7" }}>
                      {s.pageViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: "#858889" }}>
                      {ratio}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {s.url
                        ? <a href={s.url} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] transition hover:underline" style={{ color: "#5bcbf5" }}>
                            Visit ↗
                          </a>
                        : <span className="text-[11px]" style={{ color: "#5d6566" }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] rounded-full px-2 py-[2px]" style={{ background: "#14375a", color: "#5bcbf5" }}>
                        Details →
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
