import { TopBar } from "@/components/topbar/TopBar";
import { requireAuth } from "@/lib/auth-helpers";

export default async function CalendarPage() {
  await requireAuth();
  return (
    <>
      <TopBar
        title="Calendar"
        subtitle="Team schedule, meetings, and campaign milestones"
      />
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-semibold text-slate-100">Calendar coming soon</div>
          <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>
            A unified view of meetings, deadlines, and campaign milestones.
          </div>
        </div>
      </div>
    </>
  );
}
