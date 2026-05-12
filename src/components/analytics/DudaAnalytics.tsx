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

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function fmtDate(ymd: string) {
  return new Date(ymd + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function pctDelta(current: number, prev: number) {
  if (!prev) return null;
  return Math.round(((current - prev) / prev) * 100);
}
function pctStr(current: number, prev: number) {
  const d = pctDelta(current, prev);
  if (d === null) return "N/A";
  return (d >= 0 ? "+" : "") + d + "%";
}

// ── CSV export ──────────────────────────────────────────────────────────────

function csvEscape(v: string | number) {
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(data: AnalyticsData, reportLabel: string): string {
  const { sites, totals, dateRange } = data;
  const now = new Date().toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  const rows: string[] = [];

  // Header block
  rows.push(`NEO Marketing Hub — Matrix Sites Report`);
  rows.push(`Report:,${csvEscape(reportLabel)}`);
  rows.push(`Period:,${csvEscape(fmtDate(dateRange.start))} – ${csvEscape(fmtDate(dateRange.end))}`);
  rows.push(`Comparison:,${csvEscape(fmtDate(dateRange.prevStart))} – ${csvEscape(fmtDate(dateRange.prevEnd))}`);
  rows.push(`Generated:,${csvEscape(now)}`);
  rows.push(`Total Sites:,${sites.length}`);
  rows.push(`Sites with Traffic:,${sites.filter(s => s.visitors > 0).length}`);
  rows.push("");

  // Network totals summary
  rows.push("NETWORK TOTALS");
  rows.push([
    "Metric","Current Period","Previous Period","Change %",
  ].map(csvEscape).join(","));
  rows.push(["Visitors", totals.visitors, totals.prevVisitors, pctStr(totals.visitors, totals.prevVisitors)].map(csvEscape).join(","));
  rows.push(["Visits", totals.visits, totals.prevVisits, pctStr(totals.visits, totals.prevVisits)].map(csvEscape).join(","));
  rows.push(["Page Views", totals.pageViews, totals.prevPageViews, pctStr(totals.pageViews, totals.prevPageViews)].map(csvEscape).join(","));
  rows.push("");

  // Per-site data
  rows.push("SITE-BY-SITE BREAKDOWN");
  const cols = [
    "Rank",
    "Advisor / Site",
    "URL",
    "Visitors",
    "Visits",
    "Page Views",
    "Prev Visitors",
    "Prev Visits",
    "Prev Page Views",
    "Visitor Change %",
    "Visits Change %",
    "Page Views Change %",
    "Views / Visit",
    "Had Traffic This Period",
  ];
  rows.push(cols.map(csvEscape).join(","));

  const sorted = [...sites].sort((a, b) => b.visitors - a.visitors);
  sorted.forEach((s, i) => {
    const viewsPerVisit = s.visits > 0 ? (s.pageViews / s.visits).toFixed(2) : "0.00";
    const hadTraffic = s.visitors > 0 ? "Yes" : "No";
    rows.push([
      i + 1,
      s.name,
      s.url,
      s.visitors,
      s.visits,
      s.pageViews,
      s.prevVisitors,
      s.prevVisits,
      s.prevPageViews,
      pctStr(s.visitors, s.prevVisitors),
      pctStr(s.visits, s.prevVisits),
      pctStr(s.pageViews, s.prevPageViews),
      viewsPerVisit,
      hadTraffic,
    ].map(csvEscape).join(","));
  });

  rows.push("");
  rows.push("END OF REPORT — NEO Marketing Hub");

  return rows.join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["﻿" + content, ""], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Manage Sites Modal ────────────────────────────────────────────────────────

interface StoredSite { id: string; siteId: string; name: string; url: string; isManual: boolean; }

function ManageSitesModal({ onClose, onSitesChanged }: { onClose: () => void; onSitesChanged: (count: number) => void }) {
  const [sites, setSites] = useState<StoredSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; updated: number; total: number; publishedFromApi: number } | null>(null);
  const [syncError, setSyncError] = useState("");
  const [newSiteId, setNewSiteId] = useState("");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  useEffect(() => { loadSites(); }, []);

  async function loadSites() {
    setLoading(true);
    const res = await fetch("/api/duda/sites");
    const json = await res.json();
    setSites(json.sites ?? []);
    setLoading(false);
  }

  async function sync() {
    setSyncing(true); setSyncError(""); setSyncResult(null);
    try {
      const res = await fetch("/api/duda/sites/sync", { method: "POST" });
      const json = await res.json();
      if (json.error) { setSyncError(json.error); }
      else {
        setSyncResult({ added: json.added, updated: json.updated, total: json.total, publishedFromApi: json.publishedFromApi });
        setSites(json.sites ?? []);
        onSitesChanged(json.total);
      }
    } catch (e) { setSyncError(String(e)); }
    setSyncing(false);
  }

  async function addSite() {
    if (!newSiteId.trim() || !newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/duda/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: newSiteId.trim(), name: newName.trim(), url: newUrl.trim() }),
    });
    const json = await res.json();
    if (json.site) {
      setSites(prev => {
        const exists = prev.find(s => s.id === json.site.id);
        return exists ? prev.map(s => s.id === json.site.id ? json.site : s) : [...prev, json.site];
      });
      onSitesChanged(sites.length + 1);
      setNewSiteId(""); setNewName(""); setNewUrl("");
    }
    setAdding(false);
  }

  async function removeSite(site: StoredSite) {
    if (!confirm(`Remove "${site.name}" from the site list?`)) return;
    await fetch(`/api/duda/sites/${site.id}`, { method: "DELETE" });
    setSites(prev => prev.filter(s => s.id !== site.id));
    onSitesChanged(sites.length - 1);
  }

  async function saveEdit(site: StoredSite) {
    const res = await fetch(`/api/duda/sites/${site.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, url: editUrl }),
    });
    const json = await res.json();
    if (json.site) setSites(prev => prev.map(s => s.id === json.site.id ? json.site : s));
    setEditingId(null);
  }

  const filtered = sites.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.siteId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl" style={{ background: "#07192e", border: "1px solid #1d4368" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid #1d4368" }}>
          <div>
            <div className="text-[14px] font-bold text-slate-100">Manage Matrix Sites</div>
            <div className="text-[11px] mt-0.5" style={{ color: "#5d6566" }}>{sites.length} sites in list</div>
          </div>
          <button onClick={onClose} className="text-[22px] leading-none transition hover:opacity-60" style={{ color: "#858889" }}>×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Auto-sync section */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold text-slate-100">Sync from Duda API</div>
                <div className="text-[11px] mt-0.5" style={{ color: "#858889" }}>
                  Automatically discovers all published sites in your Duda account and adds any new ones.
                  Won&apos;t overwrite names you&apos;ve manually edited.
                </div>
              </div>
              <button onClick={sync} disabled={syncing}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition disabled:opacity-60 shrink-0"
                style={{ background: "#5bcbf5", color: "#061320" }}>
                {syncing
                  ? <><div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Syncing…</>
                  : <>↻ Sync Now</>}
              </button>
            </div>
            {syncResult && (
              <div className="rounded-lg px-4 py-3 text-[12px]" style={{ background: "#22c55e22", border: "1px solid #22c55e44" }}>
                <span style={{ color: "#22c55e" }}>✓ Sync complete — </span>
                <span style={{ color: "#a8aaab" }}>
                  {syncResult.publishedFromApi} published sites found · {syncResult.added} new added · {syncResult.updated} URLs updated · {syncResult.total} total in list
                </span>
              </div>
            )}
            {syncError && (
              <div className="rounded-lg px-4 py-3 text-[12px]" style={{ background: "#f43f5e22", border: "1px solid #f43f5e44", color: "#f43f5e" }}>
                Error: {syncError}
              </div>
            )}
          </div>

          {/* Manual add section */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[13px] font-semibold text-slate-100">Add Site Manually</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Duda Site ID *</label>
                <input value={newSiteId} onChange={e => setNewSiteId(e.target.value)}
                  placeholder="e.g. 1e6fa1d5"
                  className="w-full rounded-lg px-3 py-2 text-[12px] text-slate-100 outline-none font-mono"
                  style={{ background: "#0a2540", border: "1px solid #1d4368" }} />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Display Name *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full rounded-lg px-3 py-2 text-[12px] text-slate-100 outline-none"
                  style={{ background: "#0a2540", border: "1px solid #1d4368" }} />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Website URL</label>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-lg px-3 py-2 text-[12px] text-slate-100 outline-none"
                  style={{ background: "#0a2540", border: "1px solid #1d4368" }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={addSite} disabled={!newSiteId.trim() || !newName.trim() || adding}
                className="rounded-lg px-4 py-2 text-[12px] font-semibold transition disabled:opacity-40"
                style={{ background: "#5bcbf5", color: "#061320" }}>
                {adding ? "Adding…" : "+ Add Site"}
              </button>
              <span className="text-[10px]" style={{ color: "#5d6566" }}>
                Find the Site ID in your Duda dashboard URL or via Settings → General
              </span>
            </div>
          </div>

          {/* Site list */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #1d4368" }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider flex-1" style={{ color: "#858889" }}>
                {filtered.length} Sites
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search sites…"
                className="rounded-md px-3 py-1.5 text-[11px] text-slate-100 outline-none"
                style={{ background: "#0a2540", border: "1px solid #1d4368", width: 180 }} />
            </div>
            {loading ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "#5d6566" }}>Loading…</div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {filtered.map((s, i) => (
                  <div key={s.id}
                    className="flex items-center gap-3 px-4 py-3 group"
                    style={{ borderBottom: i === filtered.length - 1 ? "none" : "1px solid #0a2540" }}>
                    {editingId === s.id ? (
                      <>
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="flex-1 rounded px-2 py-1 text-[12px] text-slate-100 outline-none"
                          style={{ background: "#0a2540", border: "1px solid #1d4368" }} />
                        <input value={editUrl} onChange={e => setEditUrl(e.target.value)}
                          placeholder="URL"
                          className="w-40 rounded px-2 py-1 text-[12px] text-slate-100 outline-none"
                          style={{ background: "#0a2540", border: "1px solid #1d4368" }} />
                        <button onClick={() => saveEdit(s)} className="text-[11px] font-semibold" style={{ color: "#22c55e" }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="text-[11px]" style={{ color: "#858889" }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12.5px] font-medium text-slate-100 truncate">{s.name}</span>
                            {s.isManual && (
                              <span className="text-[9px] rounded-full px-1.5 py-[1px]" style={{ background: "#5bcbf522", color: "#5bcbf5" }}>manual</span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono mt-0.5" style={{ color: "#5d6566" }}>{s.siteId}{s.url && <> · <span style={{ color: "#5d6566" }}>{s.url.replace("https://", "")}</span></>}</div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button onClick={() => { setEditingId(s.id); setEditName(s.name); setEditUrl(s.url); }}
                            className="text-[11px] transition hover:opacity-70" style={{ color: "#5bcbf5" }}>Edit</button>
                          <button onClick={() => removeSite(s)}
                            className="text-[11px] transition hover:opacity-70" style={{ color: "#f43f5e" }}>Remove</button>
                        </div>
                      </>
                    )}
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

// ── Monthly Report Modal ─────────────────────────────────────────────────────

function MonthlyReportModal({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  // Default to previous month for a "complete" month
  useEffect(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setMonth(prev.getMonth());
    setYear(prev.getFullYear());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setLoading(true);
    setProgress("Fetching site data from Duda API…");

    try {
      // Calendar month boundaries
      const start = toYMD(new Date(year, month, 1));
      const end = toYMD(new Date(year, month + 1, 0)); // last day of month

      // Comparison: same period previous month
      const prevMonthStart = new Date(year, month - 1, 1);
      const prevMonthEnd = new Date(year, month, 0);

      setProgress("Fetching analytics for all 103 sites… (15–20 seconds)");
      const res = await fetch(`/api/duda?start=${start}&end=${end}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const data: AnalyticsData = await res.json();

      setProgress("Building spreadsheet…");

      const monthLabel = `${MONTHS[month]} ${year}`;
      const csv = buildCsv(data, `${monthLabel} Monthly Report`);
      const filename = `NEO-Matrix-Sites-${MONTHS[month]}-${year}.csv`;

      downloadCsv(csv, filename);
      setProgress("Downloaded!");
      setTimeout(onClose, 800);
    } catch (e) {
      setProgress(`Error: ${String(e)}`);
      setLoading(false);
    }
  }

  const yearOptions = [-2, -1, 0, 1].map(o => now.getFullYear() + o);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl" style={{ background: "#07192e", border: "1px solid #1d4368" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1d4368" }}>
          <div>
            <div className="text-[14px] font-bold text-slate-100">Monthly Report Export</div>
            <div className="text-[11px] mt-0.5" style={{ color: "#5d6566" }}>All 103 Matrix sites · CSV spreadsheet</div>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-[22px] leading-none transition hover:opacity-60" style={{ color: "#858889" }}>×</button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Month / Year pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Month</label>
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} disabled={loading}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Year</label>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} disabled={loading}
                className="w-full rounded-lg px-3 py-2.5 text-[13px] text-slate-100 outline-none"
                style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Preview of what will be included */}
          <div className="rounded-lg p-4 space-y-1.5" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#858889" }}>Report includes</div>
            {[
              "Network totals (visitors, visits, page views)",
              "All 103 advisor sites ranked by visitors",
              "Period vs. previous month comparison",
              "Visitor / visits / page views change %",
              "Views per visit ratio",
              "Had traffic this period (Yes/No)",
              "Direct URL for each site",
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-[11.5px]" style={{ color: "#a8aaab" }}>
                <span style={{ color: "#22c55e" }}>✓</span> {item}
              </div>
            ))}
          </div>

          {/* Progress / status */}
          {loading && (
            <div className="rounded-lg px-4 py-3 text-[12px] text-center" style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#5bcbf5" }}>
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                {progress}
              </div>
            </div>
          )}
          {!loading && progress && (
            <div className="rounded-lg px-4 py-3 text-[12px] text-center" style={{ background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e" }}>
              {progress}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #1d4368" }}>
          {!loading && <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12px] font-semibold transition hover:opacity-70" style={{ color: "#858889" }}>Cancel</button>}
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-[12.5px] font-semibold transition disabled:opacity-60"
            style={{ background: "#5bcbf5", color: "#061320" }}>
            {loading
              ? <><div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> Generating…</>
              : <>⬇ Generate & Download</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────────────

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showManageSites, setShowManageSites] = useState(false);
  const [totalSites, setTotalSites] = useState<number | null>(null);

  useEffect(() => { fetchData(30); }, []);
  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = () => setShowExportMenu(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [showExportMenu]);

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

  function exportCurrentView() {
    if (!data) return;
    const label = useCustom
      ? `Custom Range ${customStart} to ${customEnd}`
      : `Last ${preset} Days`;
    const csv = buildCsv(data, label);
    const ts = new Date().toISOString().split("T")[0];
    downloadCsv(csv, `NEO-Matrix-Sites-${ts}.csv`);
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="text-[13px]" style={{ color: "#5d6566" }}>Fetching stats for all Matrix sites…</div>
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
  const totalVisitorsDelta = pctDelta(totals.visitors, totals.prevVisitors);
  const totalVisitsDelta = pctDelta(totals.visits, totals.prevVisits);
  const totalPageViewsDelta = pctDelta(totals.pageViews, totals.prevPageViews);

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

  return (
    <div className="space-y-6">

      {/* Modals */}
      {selectedSite && (
        <SiteDetailModal
          siteId={selectedSite.siteId}
          siteName={selectedSite.name}
          siteUrl={selectedSite.url}
          onClose={() => setSelectedSite(null)}
        />
      )}
      {showMonthlyModal && <MonthlyReportModal onClose={() => setShowMonthlyModal(false)} />}
      {showManageSites && (
        <ManageSitesModal
          onClose={() => setShowManageSites(false)}
          onSitesChanged={(count) => setTotalSites(count)}
        />
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-[13px] font-semibold text-slate-100">
            {totalSites ?? sites.length} Matrix Sites
            <span className="ml-2 text-[11px] font-normal" style={{ color: "#5d6566" }}>
              {activeSites} with traffic in period
            </span>
          </div>
          <button
            onClick={() => setShowManageSites(true)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
            style={{ background: "#0e2b48", border: "1px solid #1d4368", color: "#858889" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Manage Sites
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date presets */}
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

          {/* Export dropdown */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition hover:opacity-80"
              style={{ background: "#14375a", color: "#5bcbf5", border: "1px solid #1d4368" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl p-1.5"
                style={{ background: "#0a2540", border: "1px solid #1d4368", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
                <button
                  onClick={() => { exportCurrentView(); setShowExportMenu(false); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12px] transition hover:bg-white/[0.04]"
                  style={{ color: "#cbd5e1" }}>
                  <span style={{ color: "#5bcbf5" }}>⬇</span>
                  <div>
                    <div className="font-semibold">Export Current View</div>
                    <div className="text-[10px]" style={{ color: "#5d6566" }}>Downloads the loaded date range</div>
                  </div>
                </button>
                <div className="my-1 h-px" style={{ background: "#1d4368" }} />
                <button
                  onClick={() => { setShowMonthlyModal(true); setShowExportMenu(false); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12px] transition hover:bg-white/[0.04]"
                  style={{ color: "#cbd5e1" }}>
                  <span style={{ color: "#22c55e" }}>📅</span>
                  <div>
                    <div className="font-semibold">Monthly Report</div>
                    <div className="text-[10px]" style={{ color: "#5d6566" }}>Pick a month, export full report</div>
                  </div>
                </button>
              </div>
            )}
          </div>
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
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Sites with Traffic</div>
          <div className="mt-1 text-[26px] font-bold tabular-nums leading-none" style={{ color: "#22c55e" }}>{activeSites}</div>
          <div className="mt-1.5 text-[11px]" style={{ color: "#5d6566" }}>of {totalSites ?? sites.length} published sites</div>
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
        <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #1d4368" }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider flex-1" style={{ color: "#858889" }}>
            All Sites
            <span className="ml-2 font-normal" style={{ color: "#5d6566" }}>— click any row to drill in</span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search advisor or site…"
            className="rounded-md px-3 py-1.5 text-[12px] text-slate-100 outline-none"
            style={{ background: "#0a2540", border: "1px solid #1d4368", width: 220 }}
          />
          {/* Quick export from table header */}
          <button
            onClick={exportCurrentView}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition hover:opacity-80 shrink-0"
            style={{ background: "#0a2540", border: "1px solid #1d4368", color: "#858889" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#0a2540", borderBottom: "1px solid #1d4368" }}>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>#</th>
                <SortTh label="Advisor / Site" k="name" />
                <SortTh label="Visitors" k="visitors" />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>WoW</th>
                <SortTh label="Visits" k="visits" />
                <SortTh label="Page Views" k="pageViews" />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Views/Visit</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Site</th>
                <th className="px-4 py-2.5" style={{ color: "#858889" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const isLast = i === filtered.length - 1;
                const ratio = s.visits > 0 ? (s.pageViews / s.visits).toFixed(1) : "—";
                // Rank in the full sorted list
                const rank = sites.findIndex(x => x.siteId === s.siteId) + 1;
                return (
                  <tr key={s.siteId} style={{ borderBottom: isLast ? "none" : "1px solid #0a2540" }}
                    className="hover:bg-white/[0.01] transition cursor-pointer"
                    onClick={() => setSelectedSite({ siteId: s.siteId, name: s.name, url: s.url })}>
                    <td className="px-4 py-3 text-[11px] tabular-nums" style={{ color: "#5d6566" }}>#{rank}</td>
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
