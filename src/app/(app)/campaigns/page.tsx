import { TopBar } from "@/components/topbar/TopBar";
import { requireAuth } from "@/lib/auth-helpers";

export default async function CampaignsPage() {
  await requireAuth();
  return (
    <>
      <TopBar
        title="Campaigns"
        subtitle="Plan, launch, and measure marketing campaigns"
      />
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-semibold text-slate-100">Campaigns coming soon</div>
          <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>
            End-to-end campaign management with briefs, assets, and results.
          </div>
        </div>
      </div>
    </>
  );
}
