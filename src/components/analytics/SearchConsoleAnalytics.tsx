"use client";

import { useEffect, useState } from "react";

interface GSCRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface WeekRow {
  weekStart: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCData {
  connected: boolean;
  sites?: { siteUrl: string; permissionLevel: string }[];
  overview?: GSCRow | null;
  prevOverview?: GSCRow | null;
  queries?: GSCRow[];
  pages?: GSCRow[];
  daily?: GSCRow[];
  weekly?: WeekRow[];
  dateRange?: { start: string; end: string };
  error?: string;
}

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "28 days", days: 28 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
];

function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

function deltaColor(val: number, invert = false) {
  if (val === 0) return "#5d6566";
  const positive = invert ? val < 0 : val > 0;
  return positive ? "#22c55e" : "#f43f5e";
}

function Delta({ current, prev, invert = false, format = (v: number) => v.toLocaleString() }: {
  current: number; prev: number; invert?: boolean; format?: (v: number) => string;
}) {
  if (!prev) return null;
  const diff = current - prev;
  const pct = Math.round((diff / prev) * 100);
  const color = deltaColor(diff, invert);
  const sign = diff > 0 ? "+" : "";
  return (
    <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
      {sign}{pct}% ({sign}{format(diff)})
    </span>
  );
}

function StatCard({ label, value, sub, color, current, prev, invert, format }: {
  label: string; value: string; sub?: string; color: string;
  current?: number; prev?: number; invert?: boolean; format?: (v: number) => string;
}) {
  return (
    <div className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{label}</div>
      <div className="mt-1 text-[26px] font-bold tabular-nums leading-none" style={{ color }}>{value}</div>
      {current !== undefined && prev !== undefined && (
        <div className="mt-1.5">
          <Delta current={current} prev={prev} invert={invert} format={format} />
        </div>
      )}
      {sub && !prev && <div className="mt-1 text-[11px]" style={{ color: "#5d6566" }}>{sub}</div>}
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

function fmtDate(ymd: string) {
  return new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtWeek(ymd: string) {
  const d = new Date(ymd + "T12:00:00");
  const end = new Date(d); end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function SearchConsoleAnalytics() {
  const [data, setData] = useState<GSCData | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [preset, setPreset] = useState(28);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gsc") === "connected") window.history.replaceState({}, "", window.location.pathname);
    fetchSites();
  }, []);

  async function fetchSites() {
    setLoading(true);
    try {
      const res = await fetch("/api/search-console");
      const json: GSCData = await res.json();
      if (json.connected && json.sites?.length) {
        setData(json);
        const site = json.sites[0].siteUrl;
        setSelectedSite(site);
        await fetchSiteData(site, preset);
      } else {
        setData(json);
        setLoading(false);
      }
    } catch {
      setData({ connected: false });
      setLoading(false);
    }
  }

  async function fetchSiteData(site: string, days: number, start?: string, end?: string) {
    setLoading(true);
    try {
      const endDate = end ?? toYMD(new Date());
      const startDate = start ?? (() => { const d = new Date(); d.setDate(d.getDate() - days); return toYMD(d); })();
      const res = await fetch(`/api/search-console?site=${encodeURIComponent(site)}&start=${startDate}&end=${endDate}`);
      const json: GSCData = await res.json();
      setData((prev) => ({ ...prev, ...json, sites: prev?.sites }));
    } catch { /* ignore */ }
    setLoading(false);
  }

  function applyPreset(days: number) {
    setPreset(days); setUseCustom(false);
    if (selectedSite) fetchSiteData(selectedSite, days);
  }

  function applyCustom() {
    if (!customStart || !customEnd || !selectedSite) return;
    setUseCustom(true);
    fetchSiteData(selectedSite, 0, customStart, customEnd);
  }

  function onSiteChange(site: string) {
    setSelectedSite(site);
    fetchSiteData(site, useCustom ? 0 : preset, useCustom ? customStart : undefined, useCustom ? customEnd : undefined);
  }

  function connect() { setConnecting(true); window.location.href = "/api/auth/google"; }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-[13px]" style={{ color: "#5d6566" }}>Loading Search Console data…</div>
    </div>
  );

  if (!data?.connected) return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[15px] font-semibold text-slate-100">Connect Google Search Console</div>
        <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>See clicks, impressions, top queries, and search trends.</div>
      </div>
      <button onClick={connect} disabled={connecting}
        className="rounded-md px-6 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60"
        style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.25)" }}>
        {connecting ? "Redirecting…" : "Connect Google Search Console"}
      </button>
    </div>
  );

  const ov = data.overview;
  const prev = data.prevOverview;
  const queries = data.queries ?? [];
  const pages = data.pages ?? [];
  const daily = data.daily ?? [];
  const weekly = data.weekly ?? [];
  const maxClicks = Math.max(...daily.map((d) => d.clicks), 1);
  const maxQClicks = Math.max(...queries.map((q) => q.clicks), 1);
  const maxPClicks = Math.max(...pages.map((p) => p.clicks), 1);

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Site selector */}
        <div className="flex items-center gap-3">
          {data.sites && data.sites.length > 1 ? (
            <select value={selectedSite} onChange={(e) => onSiteChange(e.target.value)}
              className="rounded-md px-3 py-1.5 text-[13px] text-slate-100 outline-none"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              {data.sites.map((s) => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
            </select>
          ) : (
            <span className="text-[12px]" style={{ color: "#5d6566" }}>{data.sites?.[0]?.siteUrl}</span>
          )}
          <button onClick={connect} className="text-[11px] transition hover:underline" style={{ color: "#5d6566" }}>Reconnect</button>
        </div>

        {/* Date range controls */}
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
          {/* Custom range */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md px-2 py-1.5 text-[12px] text-slate-100 outline-none"
              style={{ background: "#0e2b48", border: `1px solid ${useCustom ? "#5bcbf5" : "#1d4368"}` }} />
            <span style={{ color: "#5d6566" }} className="text-[11px]">to</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md px-2 py-1.5 text-[12px] text-slate-100 outline-none"
              style={{ background: "#0e2b48", border: `1px solid ${useCustom ? "#5bcbf5" : "#1d4368"}` }} />
            <button onClick={applyCustom} disabled={!customStart || !customEnd}
              className="rounded-md px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-40"
              style={{ background: "#5bcbf5", color: "#061320" }}>
              Apply
            </button>
          </div>
        </div>
      </div>

      {data.dateRange && (
        <div className="text-[11.5px]" style={{ color: "#5d6566" }}>
          Showing {fmtDate(data.dateRange.start)} – {fmtDate(data.dateRange.end)}
          {prev && <span> · compared to previous period</span>}
        </div>
      )}

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Clicks" value={ov ? ov.clicks.toLocaleString() : "—"} color="#5bcbf5"
          current={ov?.clicks} prev={prev?.clicks} />
        <StatCard label="Impressions" value={ov ? ov.impressions.toLocaleString() : "—"} color="#6366f1"
          current={ov?.impressions} prev={prev?.impressions} />
        <StatCard label="Avg CTR" value={ov ? `${(ov.ctr * 100).toFixed(1)}%` : "—"} color="#22c55e"
          current={ov ? ov.ctr * 100 : undefined} prev={prev ? prev.ctr * 100 : undefined}
          format={(v) => `${Math.abs(v).toFixed(1)}pp`} />
        <StatCard label="Avg Position" value={ov ? ov.position.toFixed(1) : "—"} color="#f59e0b"
          current={ov?.position} prev={prev?.position} invert
          format={(v) => Math.abs(v).toFixed(1)} />
      </div>

      {/* Daily clicks chart */}
      {daily.length > 0 && (
        <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
            Daily Clicks
          </div>
          <div className="mb-4 text-[11px]" style={{ color: "#5d6566" }}>
            {fmtDate(data.dateRange?.start ?? "")} – {fmtDate(data.dateRange?.end ?? "")}
          </div>
          <div className="flex h-36 items-end gap-0.5">
            {daily.map((d, i) => {
              const pct = (d.clicks / maxClicks) * 100;
              const label = d.keys?.[0] ? fmtDate(d.keys[0]) : "";
              const showLabel = daily.length <= 31 ? i % 7 === 0 : i % 14 === 0;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full flex-1 flex items-end">
                    <div className="w-full rounded-t transition-all duration-300"
                      style={{ height: `${Math.max(pct, d.clicks > 0 ? 3 : 0)}%`, background: "rgba(91,203,245,0.7)", minHeight: d.clicks > 0 ? 2 : 0 }}
                      title={`${label}: ${d.clicks} clicks, ${d.impressions} impressions`} />
                  </div>
                  {showLabel && <div className="text-[8px] tabular-nums" style={{ color: "#5d6566" }}>{label}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly report table */}
      {weekly.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid #1d4368" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Weekly Report</div>
            <div className="text-[11px] mt-0.5" style={{ color: "#5d6566" }}>Week-over-week performance breakdown</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ minWidth: 580 }}>
              <thead>
                <tr style={{ background: "#0a2540", borderBottom: "1px solid #1d4368" }}>
                  {["Week", "Clicks", "vs Prev", "Impressions", "CTR", "Avg Position"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekly.map((w, i) => {
                  const prevWeek = weekly[i - 1];
                  const clickDelta = prevWeek ? w.clicks - prevWeek.clicks : null;
                  const clickDeltaPct = prevWeek && prevWeek.clicks > 0 ? Math.round((clickDelta! / prevWeek.clicks) * 100) : null;
                  const isLast = i === weekly.length - 1;
                  return (
                    <tr key={w.weekStart} style={{ borderBottom: isLast ? "none" : "1px solid #0a2540" }}>
                      <td className="px-4 py-3 text-[12px] font-medium" style={{ color: "#a8aaab" }}>{fmtWeek(w.weekStart)}</td>
                      <td className="px-4 py-3 text-[13px] font-bold tabular-nums" style={{ color: "#5bcbf5" }}>{w.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold tabular-nums">
                        {clickDelta !== null ? (
                          <span style={{ color: clickDelta >= 0 ? "#22c55e" : "#f43f5e" }}>
                            {clickDelta >= 0 ? "+" : ""}{clickDelta.toLocaleString()}
                            {clickDeltaPct !== null && <span className="ml-1 text-[10px]">({clickDeltaPct >= 0 ? "+" : ""}{clickDeltaPct}%)</span>}
                          </span>
                        ) : <span style={{ color: "#5d6566" }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: "#6366f1" }}>{w.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: "#22c55e" }}>{(w.ctr * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: "#f59e0b" }}>{w.position.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top queries */}
        <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Top Search Queries</div>
          {queries.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No query data available.</div>
            : <div className="space-y-3">
              {queries.map((q, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] text-slate-100 truncate max-w-[55%]">{q.keys?.[0]}</span>
                    <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
                      <span style={{ color: "#5bcbf5" }}>{q.clicks} clicks</span>
                      <span style={{ color: "#5d6566" }}>{(q.ctr * 100).toFixed(1)}% CTR</span>
                      <span style={{ color: "#f59e0b" }}>#{q.position.toFixed(0)}</span>
                    </div>
                  </div>
                  <MiniBar value={q.clicks} max={maxQClicks} color="#5bcbf5" />
                </div>
              ))}
            </div>
          }
        </div>

        {/* Top pages */}
        <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Top Pages</div>
          {pages.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No page data available.</div>
            : <div className="space-y-3">
              {pages.map((p, i) => {
                const url = p.keys?.[0] ?? "";
                const path = url.replace(/^https?:\/\/[^/]+/, "") || "/";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px] text-slate-100 truncate max-w-[55%]" title={url}>{path}</span>
                      <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
                        <span style={{ color: "#6366f1" }}>{p.clicks} clicks</span>
                        <span style={{ color: "#5d6566" }}>{p.impressions.toLocaleString()} imp</span>
                        <span style={{ color: "#f59e0b" }}>pos {p.position.toFixed(1)}</span>
                      </div>
                    </div>
                    <MiniBar value={p.clicks} max={maxPClicks} color="#6366f1" />
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>

    </div>
  );
}
