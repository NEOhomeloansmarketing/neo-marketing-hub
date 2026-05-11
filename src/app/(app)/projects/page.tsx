import { TopBar } from "@/components/topbar/TopBar";
import { requireAuth } from "@/lib/auth-helpers";

export default async function ProjectsPage() {
  await requireAuth();
  return (
    <>
      <TopBar
        title="Projects"
        subtitle="Track campaigns and initiatives across the team"
      />
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-semibold text-slate-100">Projects coming soon</div>
          <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>
            Group tasks and action items into campaigns and initiatives.
          </div>
        </div>
      </div>
    </>
  );
}
