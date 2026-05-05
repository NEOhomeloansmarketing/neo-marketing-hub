import { TopBar } from "@/components/topbar/TopBar";
import { requireAuth } from "@/lib/auth-helpers";

export default async function AnalyticsPage() {
  await requireAuth();
  return (
    <>
      <TopBar
        title="Analytics"
        subtitle="Performance metrics across channels and campaigns"
        primaryAction="Export report"
      />
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-semibold text-slate-100">Analytics coming soon</div>
          <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>
            Connect your data sources to see channel and campaign performance.
          </div>
        </div>
      </div>
    </>
  );
}
