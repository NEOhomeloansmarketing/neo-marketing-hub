"use client";

import { useEffect, useState } from "react";

interface GSCRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface MovingRow extends GSCRow {
  prevPosition: number;
  positionDelta: number;
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
  devices?: GSCRow[];
  countries?: GSCRow[];
  searchTypes?: GSCRow[];
  branded?: { clicks: number; impressions: number };
  unbranded?: { clicks: number; impressions: number };
  opportunityKeywords?: GSCRow[];
  losingQueries?: MovingRow[];
  gainingQueries?: MovingRow[];
  dateRange?: { start: string; end: string; pStart: string; pEnd: string };
  error?: string;
}

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "28 days", days: 28 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
];

const DEVICE_COLORS: Record<string, string> = { MOBILE: "#5bcbf5", DESKTOP: "#6366f1", TABLET: "#a855f7" };
const COUNTRY_LABELS: Record<string, string> = { usa: "United States", can: "Canada", gbr: "United Kingdom", aus: "Australia", ind: "India", mex: "Mexico" };

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function fmtDate(ymd: string) { return new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function fmtWeek(ymd: string) {
  const d = new Date(ymd + "T12:00:00");
  const end = new Date(d); end.setDate(d.getDate() + 6);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function MiniBar({ value, max, color = "#5bcbf5" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#0a2540" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{title}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: "#5d6566" }}>{sub}</div>}
    </div>
  );
}

function StatCard({ label, value, color, delta, deltaLabel }: {
  label: string; value: string; color: string; delta?: number; deltaLabel?: string;
}) {
  const sign = delta !== undefined && delta > 0 ? "+" : "";
  const deltaColor = delta === undefined ? "#5d6566" : delta > 0 ? "#22c55e" : delta < 0 ? "#f43f5e" : "#5d6566";
  return (
    <div className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{label}</div>
      <div className="mt-1 text-[26px] font-bold tabular-nums leading-none" style={{ color }}>{value}</div>
      {delta !== undefined && (
        <div className="mt-1.5 text-[11px] font-semibold tabular-nums" style={{ color: deltaColor }}>
          {sign}{deltaLabel ?? delta} vs prev period
        </div>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg p-5 ${className}`} style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      {children}
    </div>
  );
}

export function SearchConsoleAnalytics() {
  const [data, setData] = useState<GSCData | null>(null);
  const [selectedSite, setSelectedSite] = useState("");
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
        await fetchSiteData(site, 28);
      } else { setData(json); setLoading(false); }
    } catch { setData({ connected: false }); setLoading(false); }
  }

  async function fetchSiteData(site: string, days: number, start?: string, end?: string) {
    setLoading(true);
    try {
      const e = end ?? toYMD(new Date());
      const s = start ?? (() => { const d = new Date(); d.setDate(d.getDate() - days); return toYMD(d); })();
      const res = await fetch(`/api/search-console?site=${encodeURIComponent(site)}&start=${s}&end=${e}`);
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
  const devices = data.devices ?? [];
  const countries = data.countries ?? [];
  const searchTypes = data.searchTypes ?? [];
  const branded = data.branded ?? { clicks: 0, impressions: 0 };
  const unbranded = data.unbranded ?? { clicks: 0, impressions: 0 };
  const opportunity = data.opportunityKeywords ?? [];
  const losing = data.losingQueries ?? [];
  const gaining = data.gainingQueries ?? [];

  const maxDailyClicks = Math.max(...daily.map((d) => d.clicks), 1);
  const maxQClicks = Math.max(...queries.map((q) => q.clicks), 1);
  const maxPClicks = Math.max(...pages.map((p) => p.clicks), 1);
  const maxDeviceClicks = Math.max(...devices.map((d) => d.clicks), 1);
  const maxCountryClicks = Math.max(...countries.map((c) => c.clicks), 1);
  const totalBranded = branded.clicks + unbranded.clicks || 1;

  const clickDelta = ov && prev ? ov.clicks - prev.clicks : undefined;
  const clickDeltaPct = clickDelta !== undefined && prev?.clicks ? Math.round((clickDelta / prev.clicks) * 100) : undefined;
  const impDelta = ov && prev ? ov.impressions - prev.impressions : undefined;
  const impDeltaPct = impDelta !== undefined && prev?.impressions ? Math.round((impDelta / prev.impressions) * 100) : undefined;
  const ctrDelta = ov && prev ? (ov.ctr - prev.ctr) * 100 : undefined;
  const posDelta = ov && prev ? ov.position - prev.position : undefined;

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {data.sites && data.sites.length > 1 ? (
            <select value={selectedSite} onChange={(e) => { setSelectedSite(e.target.value); fetchSiteData(e.target.value, preset); }}
              className="rounded-md px-3 py-1.5 text-[13px] text-slate-100 outline-none"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              {data.sites.map((s) => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
            </select>
          ) : <span className="text-[12px]" style={{ color: "#5d6566" }}>{data.sites?.[0]?.siteUrl}</span>}
          <button onClick={connect} className="text-[11px] transition hover:underline" style={{ color: "#5d6566" }}>Reconnect</button>
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

      {data.dateRange && (
        <div className="text-[11.5px]" style={{ color: "#5d6566" }}>
          {fmtDate(data.dateRange.start)} – {fmtDate(data.dateRange.end)}
          {prev && <span> · compared to {fmtDate(data.dateRange.pStart)} – {fmtDate(data.dateRange.pEnd)}</span>}
        </div>
      )}

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Clicks" value={ov ? ov.clicks.toLocaleString() : "—"} color="#5bcbf5"
          delta={clickDeltaPct} deltaLabel={clickDeltaPct !== undefined ? `${clickDeltaPct > 0 ? "+" : ""}${clickDeltaPct}%` : undefined} />
        <StatCard label="Impressions" value={ov ? ov.impressions.toLocaleString() : "—"} color="#6366f1"
          delta={impDeltaPct} deltaLabel={impDeltaPct !== undefined ? `${impDeltaPct > 0 ? "+" : ""}${impDeltaPct}%` : undefined} />
        <StatCard label="Avg CTR" value={ov ? `${(ov.ctr * 100).toFixed(1)}%` : "—"} color="#22c55e"
          delta={ctrDelta} deltaLabel={ctrDelta !== undefined ? `${ctrDelta > 0 ? "+" : ""}${ctrDelta.toFixed(1)}pp` : undefined} />
        <StatCard label="Avg Position" value={ov ? ov.position.toFixed(1) : "—"} color="#f59e0b"
          delta={posDelta ? -posDelta : undefined}
          deltaLabel={posDelta !== undefined ? `${posDelta > 0 ? "↓" : "↑"} ${Math.abs(posDelta).toFixed(1)} pos` : undefined} />
      </div>

      {/* Branded vs Unbranded */}
      <Card>
        <SectionHeader title="Branded vs Unbranded Traffic" sub='Branded = searches containing "neo" or "neo home loans"' />
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Branded", data: branded, color: "#5bcbf5" },
            { label: "Unbranded", data: unbranded, color: "#a855f7" },
          ].map(({ label, data: d, color }) => (
            <div key={label} className="rounded-lg p-4" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#858889" }}>{label}</div>
              <div className="text-[24px] font-bold tabular-nums" style={{ color }}>{d.clicks.toLocaleString()}</div>
              <div className="text-[11px] mt-0.5 mb-3" style={{ color: "#5d6566" }}>{d.impressions.toLocaleString()} impressions</div>
              <MiniBar value={d.clicks} max={totalBranded} color={color} />
              <div className="text-[11px] mt-1 font-semibold" style={{ color }}>
                {Math.round((d.clicks / totalBranded) * 100)}% of clicks
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily chart */}
      {daily.length > 0 && (
        <Card>
          <SectionHeader title="Daily Clicks" sub={data.dateRange ? `${fmtDate(data.dateRange.start)} – ${fmtDate(data.dateRange.end)}` : undefined} />
          <div className="flex h-36 items-end gap-0.5">
            {daily.map((d, i) => {
              const pct = (d.clicks / maxDailyClicks) * 100;
              const label = d.keys?.[0] ? fmtDate(d.keys[0]) : "";
              const showLabel = daily.length <= 31 ? i % 7 === 0 : i % 14 === 0;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full flex-1 flex items-end">
                    <div className="w-full rounded-t transition-all"
                      style={{ height: `${Math.max(pct, d.clicks > 0 ? 3 : 0)}%`, background: "rgba(91,203,245,0.7)", minHeight: d.clicks > 0 ? 2 : 0 }}
                      title={`${label}: ${d.clicks} clicks`} />
                  </div>
                  {showLabel && <div className="text-[8px] tabular-nums" style={{ color: "#5d6566" }}>{label}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Weekly report */}
      {weekly.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid #1d4368" }}>
            <SectionHeader title="Weekly Report" sub="Week-over-week performance" />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ minWidth: 580 }}>
              <thead>
                <tr style={{ background: "#0a2540", borderBottom: "1px solid #1d4368" }}>
                  {["Week", "Clicks", "WoW", "Impressions", "CTR", "Avg Position"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekly.map((w, i) => {
                  const pw = weekly[i - 1];
                  const diff = pw ? w.clicks - pw.clicks : null;
                  const pct = pw && pw.clicks > 0 ? Math.round((diff! / pw.clicks) * 100) : null;
                  return (
                    <tr key={w.weekStart} style={{ borderBottom: i === weekly.length - 1 ? "none" : "1px solid #0a2540" }}>
                      <td className="px-4 py-3 text-[12px] font-medium" style={{ color: "#a8aaab" }}>{fmtWeek(w.weekStart)}</td>
                      <td className="px-4 py-3 text-[13px] font-bold tabular-nums" style={{ color: "#5bcbf5" }}>{w.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold tabular-nums">
                        {diff !== null
                          ? <span style={{ color: diff >= 0 ? "#22c55e" : "#f43f5e" }}>{diff >= 0 ? "+" : ""}{diff.toLocaleString()} {pct !== null && `(${pct >= 0 ? "+" : ""}${pct}%)`}</span>
                          : <span style={{ color: "#5d6566" }}>—</span>}
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

      {/* Opportunity + Losing + Gaining */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Opportunity keywords */}
        <Card>
          <SectionHeader title="🎯 Opportunity Keywords" sub="Ranking 4–15 with decent impressions — push these to page 1" />
          {opportunity.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No opportunities found.</div>
            : <div className="space-y-2.5">
              {opportunity.map((r, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-slate-100 truncate max-w-[55%]">{r.keys?.[0]}</span>
                    <div className="flex items-center gap-2 text-[10.5px] tabular-nums shrink-0">
                      <span className="font-bold rounded px-1.5 py-0.5" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>#{r.position.toFixed(0)}</span>
                      <span style={{ color: "#5d6566" }}>{r.impressions.toLocaleString()} imp</span>
                    </div>
                  </div>
                  <MiniBar value={r.impressions} max={Math.max(...opportunity.map((o) => o.impressions), 1)} color="#f59e0b" />
                </div>
              ))}
            </div>
          }
        </Card>

        {/* Losing queries */}
        <Card>
          <SectionHeader title="📉 Losing Rankings" sub="Biggest position drops vs previous period" />
          {losing.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No significant drops found.</div>
            : <div className="space-y-2.5">
              {losing.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-100 truncate max-w-[55%]">{r.keys?.[0]}</span>
                  <div className="flex items-center gap-2 text-[10.5px] tabular-nums shrink-0">
                    <span style={{ color: "#a8aaab" }}>#{r.prevPosition.toFixed(0)}</span>
                    <span style={{ color: "#5d6566" }}>→</span>
                    <span className="font-bold" style={{ color: "#f43f5e" }}>#{r.position.toFixed(0)}</span>
                    <span className="rounded px-1.5 py-0.5 font-bold" style={{ background: "rgba(244,63,94,0.12)", color: "#f43f5e" }}>
                      ↓{r.positionDelta.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          }
        </Card>

        {/* Gaining queries */}
        <Card>
          <SectionHeader title="📈 Gaining Rankings" sub="Biggest position improvements vs previous period" />
          {gaining.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No significant gains found.</div>
            : <div className="space-y-2.5">
              {gaining.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-100 truncate max-w-[55%]">{r.keys?.[0]}</span>
                  <div className="flex items-center gap-2 text-[10.5px] tabular-nums shrink-0">
                    <span style={{ color: "#a8aaab" }}>#{r.prevPosition.toFixed(0)}</span>
                    <span style={{ color: "#5d6566" }}>→</span>
                    <span className="font-bold" style={{ color: "#22c55e" }}>#{r.position.toFixed(0)}</span>
                    <span className="rounded px-1.5 py-0.5 font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                      ↑{Math.abs(r.positionDelta).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          }
        </Card>
      </div>

      {/* Top queries + pages */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Top Search Queries" />
          {queries.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No data.</div>
            : <div className="space-y-3">
              {queries.map((q, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] text-slate-100 truncate max-w-[50%]">{q.keys?.[0]}</span>
                    <div className="flex items-center gap-2 text-[10.5px] tabular-nums shrink-0">
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
        </Card>

        <Card>
          <SectionHeader title="Top Pages" />
          {pages.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No data.</div>
            : <div className="space-y-3">
              {pages.map((p, i) => {
                const url = p.keys?.[0] ?? "";
                const path = url.replace(/^https?:\/\/[^/]+/, "") || "/";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px] text-slate-100 truncate max-w-[50%]" title={url}>{path}</span>
                      <div className="flex items-center gap-2 text-[10.5px] tabular-nums shrink-0">
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
        </Card>
      </div>

      {/* Device + Country + Search type */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Device */}
        <Card>
          <SectionHeader title="Traffic by Device" />
          {devices.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No data.</div>
            : <div className="space-y-3">
              {devices.map((d, i) => {
                const device = d.keys?.[0]?.toUpperCase() ?? "";
                const color = DEVICE_COLORS[device] ?? "#5bcbf5";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px] capitalize text-slate-100">{device.toLowerCase()}</span>
                      <div className="flex items-center gap-2 text-[10.5px] tabular-nums">
                        <span style={{ color }}>{d.clicks.toLocaleString()} clicks</span>
                        <span style={{ color: "#5d6566" }}>{(d.ctr * 100).toFixed(1)}% CTR</span>
                      </div>
                    </div>
                    <MiniBar value={d.clicks} max={maxDeviceClicks} color={color} />
                  </div>
                );
              })}
            </div>
          }
        </Card>

        {/* Country */}
        <Card>
          <SectionHeader title="Traffic by Country" />
          {countries.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No data.</div>
            : <div className="space-y-3">
              {countries.map((c, i) => {
                const code = c.keys?.[0]?.toLowerCase() ?? "";
                const label = COUNTRY_LABELS[code] ?? code.toUpperCase();
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px] text-slate-100">{label}</span>
                      <span className="text-[10.5px] tabular-nums" style={{ color: "#5bcbf5" }}>{c.clicks.toLocaleString()} clicks</span>
                    </div>
                    <MiniBar value={c.clicks} max={maxCountryClicks} color="#5bcbf5" />
                  </div>
                );
              })}
            </div>
          }
        </Card>

        {/* Search appearance / type */}
        <Card>
          <SectionHeader title="Search Appearance" sub="How your site appears in Google results" />
          {searchTypes.length === 0
            ? <div className="text-[12px]" style={{ color: "#5d6566" }}>No data.</div>
            : <div className="space-y-3">
              {searchTypes.map((s, i) => {
                const type = s.keys?.[0] ?? "";
                const maxST = Math.max(...searchTypes.map((x) => x.clicks), 1);
                const colors = ["#5bcbf5", "#6366f1", "#a855f7", "#22c55e", "#f59e0b"];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px] text-slate-100 capitalize">{type.toLowerCase().replace(/_/g, " ")}</span>
                      <span className="text-[10.5px] tabular-nums" style={{ color: colors[i % colors.length] }}>{s.clicks.toLocaleString()} clicks</span>
                    </div>
                    <MiniBar value={s.clicks} max={maxST} color={colors[i % colors.length]} />
                  </div>
                );
              })}
            </div>
          }
        </Card>
      </div>

      {/* GA4 callout */}
      <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="text-[18px] mt-0.5">📊</div>
        <div>
          <div className="text-[12.5px] font-semibold text-slate-100">Want social & paid traffic data too?</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: "#858889" }}>
            Search Console only covers organic search. Social media, paid ads, and direct traffic require a <strong style={{ color: "#5bcbf5" }}>Google Analytics 4</strong> integration — ask and we can add it.
          </div>
        </div>
      </div>

    </div>
  );
}
