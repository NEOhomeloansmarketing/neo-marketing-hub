"use client";

import { useEffect, useState } from "react";

interface GSCRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCData {
  connected: boolean;
  sites?: { siteUrl: string; permissionLevel: string }[];
  overview?: GSCRow | null;
  queries?: GSCRow[];
  pages?: GSCRow[];
  daily?: GSCRow[];
  error?: string;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{label}</div>
      <div className="mt-1 text-[28px] font-bold tabular-nums leading-none" style={{ color }}>{value}</div>
      {sub && <div className="mt-1 text-[11px]" style={{ color: "#5d6566" }}>{sub}</div>}
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

export function SearchConsoleAnalytics() {
  const [data, setData] = useState<GSCData | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check for connection status in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("gsc") === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSite) fetchSiteData(selectedSite);
  }, [selectedSite]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/search-console");
      const json: GSCData = await res.json();
      setData(json);
      if (json.connected && json.sites && json.sites.length > 0) {
        setSelectedSite(json.sites[0].siteUrl);
      }
    } catch {
      setData({ connected: false });
    }
    setLoading(false);
  }

  async function fetchSiteData(site: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/search-console?site=${encodeURIComponent(site)}`);
      const json: GSCData = await res.json();
      setData((prev) => ({ ...prev, ...json }));
    } catch { /* ignore */ }
    setLoading(false);
  }

  function connect() {
    setConnecting(true);
    window.location.href = "/api/auth/google";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[13px]" style={{ color: "#5d6566" }}>Loading Search Console data…</div>
      </div>
    );
  }

  // Not connected
  if (!data?.connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="text-center">
          <div className="text-[15px] font-semibold text-slate-100">Connect Google Search Console</div>
          <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>
            See clicks, impressions, top queries, and search trends for your site.
          </div>
        </div>
        <button
          onClick={connect}
          disabled={connecting}
          className="flex items-center gap-2 rounded-md px-6 py-2.5 text-[13px] font-semibold text-white transition disabled:opacity-60"
          style={{ background: "linear-gradient(180deg,#5bcbf5,#3aa6cc)", boxShadow: "0 4px 14px rgba(91,203,245,0.25)" }}>
          {connecting ? "Redirecting…" : "Connect Google Search Console"}
        </button>
      </div>
    );
  }

  const overview = data.overview;
  const queries = data.queries ?? [];
  const pages = data.pages ?? [];
  const daily = data.daily ?? [];
  const maxClicks = Math.max(...daily.map((d) => d.clicks), 1);
  const maxQueryClicks = Math.max(...queries.map((q) => q.clicks), 1);
  const maxPageClicks = Math.max(...pages.map((p) => p.clicks), 1);

  return (
    <div className="space-y-6">

      {/* Site selector + reconnect */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {data.sites && data.sites.length > 1 && (
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="rounded-md px-3 py-1.5 text-[13px] text-slate-100 outline-none"
            style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            {data.sites.map((s) => (
              <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>
            ))}
          </select>
        )}
        {data.sites && data.sites.length === 1 && (
          <div className="text-[12px] font-medium" style={{ color: "#5d6566" }}>
            {data.sites[0].siteUrl}
          </div>
        )}
        <button onClick={connect} className="text-[11px] font-medium transition hover:underline" style={{ color: "#5d6566" }}>
          Reconnect
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Clicks" value={overview ? overview.clicks.toLocaleString() : "—"} color="#5bcbf5" sub="Last 28 days" />
        <StatCard label="Impressions" value={overview ? overview.impressions.toLocaleString() : "—"} color="#6366f1" sub="Last 28 days" />
        <StatCard label="Avg CTR" value={overview ? `${(overview.ctr * 100).toFixed(1)}%` : "—"} color="#22c55e" sub="Click-through rate" />
        <StatCard label="Avg Position" value={overview ? overview.position.toFixed(1) : "—"} color="#f59e0b" sub="Search ranking" />
      </div>

      {/* Daily clicks trend */}
      {daily.length > 0 && (
        <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
            Daily Clicks — Last 28 Days
          </div>
          <div className="flex h-32 items-end gap-1">
            {daily.map((d, i) => {
              const pct = (d.clicks / maxClicks) * 100;
              const label = d.keys?.[0] ? new Date(d.keys[0]).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) : "";
              return (
                <div key={i} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max(pct, d.clicks > 0 ? 4 : 0)}%`,
                        background: "rgba(91,203,245,0.7)",
                        minHeight: d.clicks > 0 ? 3 : 0,
                      }}
                      title={`${label}: ${d.clicks} clicks`}
                    />
                  </div>
                  {i % 7 === 0 && (
                    <div className="text-[8px] tabular-nums" style={{ color: "#5d6566" }}>{label}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top queries */}
        <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
            Top Search Queries
          </div>
          {queries.length === 0 ? (
            <div className="text-[12px]" style={{ color: "#5d6566" }}>No query data available.</div>
          ) : (
            <div className="space-y-3">
              {queries.map((q, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] text-slate-100 truncate max-w-[60%]">{q.keys?.[0]}</span>
                    <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
                      <span style={{ color: "#5bcbf5" }}>{q.clicks} clicks</span>
                      <span style={{ color: "#5d6566" }}>{(q.ctr * 100).toFixed(1)}% CTR</span>
                    </div>
                  </div>
                  <MiniBar value={q.clicks} max={maxQueryClicks} color="#5bcbf5" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top pages */}
        <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
            Top Pages
          </div>
          {pages.length === 0 ? (
            <div className="text-[12px]" style={{ color: "#5d6566" }}>No page data available.</div>
          ) : (
            <div className="space-y-3">
              {pages.map((p, i) => {
                const url = p.keys?.[0] ?? "";
                const path = url.replace(/^https?:\/\/[^/]+/, "") || "/";
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12.5px] text-slate-100 truncate max-w-[60%]" title={url}>{path}</span>
                      <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
                        <span style={{ color: "#6366f1" }}>{p.clicks} clicks</span>
                        <span style={{ color: "#5d6566" }}>pos {p.position.toFixed(1)}</span>
                      </div>
                    </div>
                    <MiniBar value={p.clicks} max={maxPageClicks} color="#6366f1" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
