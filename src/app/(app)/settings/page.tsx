import { TopBar } from "@/components/topbar/TopBar";
import { requireAuth } from "@/lib/auth-helpers";

export default async function SettingsPage() {
  await requireAuth();
  return (
    <>
      <TopBar
        title="Settings"
        subtitle="Workspace preferences and integrations"
      />
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-semibold text-slate-100">Settings coming soon</div>
          <div className="mt-1 text-[13px]" style={{ color: "#858889" }}>
            Workspace configuration, notification preferences, and integrations.
          </div>
        </div>
      </div>
    </>
  );
}
