"use client";

interface ComplianceStats {
  total: number;
  active: number;
  inactive: number;
  checklist: {
    auditForm: number;
    matrix: number;
    canva: number;
    socialTool: number;
  };
  channels: { platform: string; label: string; count: number }[];
  byLeader: {
    leader: string;
    total: number;
    auditForm: number;
    matrix: number;
    canva: number;
    socialTool: number;
  }[];
  weeklyAdded: { label: string; count: number }[];
  weeklyIncrease: {
    label: string;
    auditForm: number;
    matrix: number;
    canva: number;
    socialTool: number;
  }[];
}

// Canva / Matrix / Social Tool = "signed up / not signed up"
// Audit Form = "complete / not complete"
const CHECKLIST_ITEMS = [
  { key: "auditForm" as const, label: "Audit Form", signedUpLabel: "Complete", notLabel: "Not Complete", color: "#5bcbf5" },
  { key: "matrix" as const, label: "Matrix", signedUpLabel: "Signed Up", notLabel: "Not Signed Up", color: "#6366f1" },
  { key: "canva" as const, label: "Canva", signedUpLabel: "Signed Up", notLabel: "Not Signed Up", color: "#a855f7" },
  { key: "socialTool" as const, label: "Social Tool", signedUpLabel: "Signed Up", notLabel: "Not Signed Up", color: "#22c55e" },
];

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: "#0a2540" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function PctRing({ pct, color }: { pct: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#0a2540" strokeWidth="8" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

export function ComplianceAnalytics({ stats }: { stats: ComplianceStats }) {
  const total = stats.total || 1;
  const maxChannel = Math.max(...stats.channels.map((c) => c.count), 1);
  const maxWeek = Math.max(...stats.weeklyAdded.map((w) => w.count), 1);
  const maxIncrease = Math.max(
    ...stats.weeklyIncrease.flatMap((w) => [w.auditForm, w.matrix, w.canva, w.socialTool]),
    1
  );

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Advisors", value: stats.total, color: "#5bcbf5" },
          { label: "Active", value: stats.active, color: "#22c55e" },
          { label: "Inactive", value: stats.inactive, color: "#f59e0b" },
          {
            label: "Avg Sign-up Rate",
            value: `${Math.round(((stats.checklist.auditForm + stats.checklist.matrix + stats.checklist.canva + stats.checklist.socialTool) / (total * 4)) * 100)}%`,
            color: "#a855f7",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{s.label}</div>
            <div className="mt-1 text-[28px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Checklist sign-up breakdown */}
      <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
          Platform Sign-ups &amp; Audit Status
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CHECKLIST_ITEMS.map(({ key, label, signedUpLabel, notLabel, color }) => {
            const signedUp = stats.checklist[key];
            const notSignedUp = stats.total - signedUp;
            const pct = Math.round((signedUp / total) * 100);
            return (
              <div key={key} className="flex flex-col items-center gap-3 rounded-lg p-4"
                style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
                <PctRing pct={pct} color={color} />
                <div className="text-center w-full">
                  <div className="text-[13px] font-bold text-slate-100">{label}</div>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: "#858889" }}>{signedUpLabel}</span>
                      <span className="font-bold tabular-nums" style={{ color }}>{signedUp}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: "#858889" }}>{notLabel}</span>
                      <span className="font-semibold tabular-nums" style={{ color: "#f59e0b" }}>{notSignedUp}</span>
                    </div>
                  </div>
                </div>
                <div className="w-full">
                  <HBar value={signedUp} max={total} color={color} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly increase per section */}
      <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
          Weekly Increase by Section
        </div>
        <div className="mb-4 text-[11px]" style={{ color: "#5d6566" }}>
          New sign-ups / completions added each week across all four sections
        </div>

        {/* Grouped bar chart */}
        <div className="flex h-40 items-end gap-3">
          {stats.weeklyIncrease.map((w, wi) => {
            const bars = [
              { val: w.auditForm, color: "#5bcbf5", label: "Audit" },
              { val: w.matrix, color: "#6366f1", label: "Matrix" },
              { val: w.canva, color: "#a855f7", label: "Canva" },
              { val: w.socialTool, color: "#22c55e", label: "Social" },
            ];
            return (
              <div key={wi} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center gap-[2px]">
                  {bars.map(({ val, color, label }) => (
                    <div key={label} className="group relative flex-1 flex flex-col items-center justify-end">
                      {val > 0 && (
                        <span className="mb-0.5 text-[9px] font-bold tabular-nums" style={{ color }}>+{val}</span>
                      )}
                      <div
                        className="w-full rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max((val / maxIncrease) * 100, val > 0 ? 6 : 0)}%`,
                          background: val > 0 ? color : "#14375a",
                          opacity: val > 0 ? 0.8 : 0.3,
                          minHeight: 3,
                        }}
                        title={`${label}: +${val}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[9px] tabular-nums text-center" style={{ color: "#5d6566" }}>{w.label}</div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4">
          {CHECKLIST_ITEMS.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
              <span className="text-[11px]" style={{ color: "#858889" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Weekly table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1d4368" }}>
                <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Week</th>
                {CHECKLIST_ITEMS.map(({ label, color }) => (
                  <th key={label} className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</th>
                ))}
                <th className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.weeklyIncrease.map((w, i) => {
                const rowTotal = w.auditForm + w.matrix + w.canva + w.socialTool;
                return (
                  <tr key={i} style={{ borderBottom: i === stats.weeklyIncrease.length - 1 ? "none" : "1px solid #0a2540" }}>
                    <td className="py-2 text-[11.5px] font-medium" style={{ color: "#a8aaab" }}>{w.label}</td>
                    {[
                      { val: w.auditForm, color: "#5bcbf5" },
                      { val: w.matrix, color: "#6366f1" },
                      { val: w.canva, color: "#a855f7" },
                      { val: w.socialTool, color: "#22c55e" },
                    ].map(({ val, color }, j) => (
                      <td key={j} className="py-2 text-center text-[12px] font-semibold tabular-nums"
                        style={{ color: val > 0 ? color : "#5d6566" }}>
                        {val > 0 ? `+${val}` : "—"}
                      </td>
                    ))}
                    <td className="py-2 text-center text-[12px] font-bold tabular-nums" style={{ color: rowTotal > 0 ? "#cbd5e1" : "#5d6566" }}>
                      {rowTotal > 0 ? `+${rowTotal}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Weekly advisors added */}
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
              Advisors Added per Week
            </div>
            <div className="flex h-32 items-end gap-2">
              {stats.weeklyAdded.map((w) => {
                const heightPct = maxWeek > 0 ? (w.count / maxWeek) * 100 : 0;
                return (
                  <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(heightPct, w.count > 0 ? 6 : 0)}%`,
                          background: "rgba(91,203,245,0.6)",
                          minHeight: w.count > 0 ? 4 : 0,
                        }}
                        title={`${w.count} added`}
                      />
                    </div>
                    <div className="text-[9px] tabular-nums" style={{ color: "#5d6566" }}>{w.label}</div>
                    <div className="text-[10px] font-bold" style={{ color: w.count > 0 ? "#5bcbf5" : "#5d6566" }}>
                      {w.count > 0 ? `+${w.count}` : "0"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Channel adoption */}
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
              Channel Adoption
            </div>
            <div className="space-y-2.5">
              {stats.channels.map((ch) => {
                const pct = Math.round((ch.count / total) * 100);
                return (
                  <div key={ch.platform}>
                    <div className="mb-1 flex items-center justify-between text-[11.5px]">
                      <span style={{ color: "#cbd5e1" }}>{ch.label}</span>
                      <span className="tabular-nums" style={{ color: "#a8aaab" }}>
                        {ch.count} <span style={{ color: "#5d6566" }}>({pct}%)</span>
                      </span>
                    </div>
                    <HBar value={ch.count} max={maxChannel} color="#5bcbf5" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* By Division Leader */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889", borderBottom: "1px solid #1d4368" }}>
          Sign-ups by Division Leader
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
                {["Division Lead", "Advisors", "Audit Form", "Matrix", "Canva", "Social Tool", "Overall"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.byLeader.map((row, i) => {
                const overallPct = Math.round(
                  ((row.auditForm + row.matrix + row.canva + row.socialTool) / (row.total * 4)) * 100
                );
                const cell = (count: number) => {
                  const p = Math.round((count / (row.total || 1)) * 100);
                  const color = p === 100 ? "#22c55e" : p >= 50 ? "#f59e0b" : "#fca5a5";
                  return (
                    <td className="px-4 py-3 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span style={{ color }} className="font-semibold tabular-nums w-8">{p}%</span>
                        <span style={{ color: "#5d6566" }} className="text-[10.5px]">{count}/{row.total}</span>
                      </div>
                    </td>
                  );
                };
                return (
                  <tr key={row.leader} style={{ borderBottom: i === stats.byLeader.length - 1 ? "none" : "1px solid #1d4368" }}>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-100">{row.leader}</td>
                    <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: "#a8aaab" }}>{row.total}</td>
                    {cell(row.auditForm)}
                    {cell(row.matrix)}
                    {cell(row.canva)}
                    {cell(row.socialTool)}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <HBar value={overallPct} max={100}
                            color={overallPct === 100 ? "#22c55e" : overallPct >= 50 ? "#f59e0b" : "#f43f5e"} />
                        </div>
                        <span className="text-[11.5px] font-bold tabular-nums"
                          style={{ color: overallPct === 100 ? "#22c55e" : overallPct >= 50 ? "#f59e0b" : "#fca5a5" }}>
                          {overallPct}%
                        </span>
                      </div>
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
