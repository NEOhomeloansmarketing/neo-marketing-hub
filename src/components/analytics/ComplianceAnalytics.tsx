"use client";

interface ComplianceStats {
  total: number;
  active: number;
  inactive: number;
  avgCompletionPct: number;
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
  weeklyChecklist: {
    label: string;
    auditForm: number;
    matrix: number;
    canva: number;
    socialTool: number;
  }[];
}

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

const CHECKLIST_ITEMS = [
  { key: "auditForm" as const, label: "Audit Form", color: "#5bcbf5" },
  { key: "matrix" as const, label: "Matrix", color: "#6366f1" },
  { key: "canva" as const, label: "Canva", color: "#a855f7" },
  { key: "socialTool" as const, label: "Social Tool", color: "#22c55e" },
];

export function ComplianceAnalytics({ stats }: { stats: ComplianceStats }) {
  const total = stats.total || 1;
  const maxChannel = Math.max(...stats.channels.map((c) => c.count), 1);
  const maxWeek = Math.max(...stats.weeklyAdded.map((w) => w.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Advisors", value: stats.total, color: "#5bcbf5" },
          { label: "Active", value: stats.active, color: "#22c55e" },
          { label: "Inactive", value: stats.inactive, color: "#f59e0b" },
          { label: "Avg Completion", value: `${stats.avgCompletionPct}%`, color: "#a855f7" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>{s.label}</div>
            <div className="mt-1 text-[28px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Checklist completion rings + bars */}
      <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
          Onboarding Checklist Completion
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {CHECKLIST_ITEMS.map(({ key, label, color }) => {
            const count = stats.checklist[key];
            const pct = Math.round((count / total) * 100);
            const missing = total - count;
            return (
              <div key={key} className="flex flex-col items-center gap-3 rounded-lg p-4"
                style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
                <PctRing pct={pct} color={color} />
                <div className="text-center">
                  <div className="text-[13px] font-bold text-slate-100">{label}</div>
                  <div className="mt-1 text-[11px]" style={{ color: "#858889" }}>
                    <span style={{ color }}>{count}</span> complete · <span style={{ color: "#f59e0b" }}>{missing}</span> pending
                  </div>
                </div>
                <div className="w-full">
                  <HBar value={count} max={total} color={color} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Weekly advisors added */}
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
              Advisors Added per Week (last 8 weeks)
            </div>
            <div className="flex h-36 items-end gap-2">
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
                          minHeight: w.count > 0 ? 6 : 0,
                        }}
                        title={`${w.count} added`}
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
          Completion by Division Leader
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
                    <td key={count} className="px-4 py-3 text-[12px]">
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

      {/* Weekly checklist activity */}
      <div className="rounded-lg p-5" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>
          Checklist Activity by Week
        </div>
        <div className="mb-4 text-[11px]" style={{ color: "#5d6566" }}>
          Advisors with each item completed, among those updated that week
        </div>
        <div className="flex h-36 items-end gap-1.5">
          {stats.weeklyChecklist.map((w, wi) => {
            const maxVal = Math.max(w.auditForm, w.matrix, w.canva, w.socialTool, 1);
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
                    <div
                      key={label}
                      className="flex-1 rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max((val / maxVal) * 100, val > 0 ? 6 : 0)}%`,
                        background: val > 0 ? color : "transparent",
                        minHeight: val > 0 ? 4 : 0,
                        opacity: 0.75,
                      }}
                      title={`${label}: ${val}`}
                    />
                  ))}
                </div>
                <div className="text-[9px] tabular-nums" style={{ color: "#5d6566" }}>{w.label}</div>
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
      </div>
    </div>
  );
}
