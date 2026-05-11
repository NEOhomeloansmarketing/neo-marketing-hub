import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const signOutUrl = "/sign-in";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#061320" }}>
      <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
        {/* Icon */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(91,203,245,0.1)", border: "1px solid rgba(91,203,245,0.2)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5bcbf5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1 className="text-[22px] font-bold tracking-tight text-slate-100">Awaiting Approval</h1>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#858889" }}>
          Your account has been created for <span className="font-semibold" style={{ color: "#cbd5e1" }}>{user.email}</span>.
          An admin needs to approve your access before you can log in.
        </p>

        <div className="mt-6 rounded-lg px-4 py-3 text-left text-[12px] space-y-1.5" style={{ background: "#0a2540", border: "1px solid #1d4368" }}>
          <div className="flex items-center gap-2" style={{ color: "#858889" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Account created successfully
          </div>
          <div className="flex items-center gap-2" style={{ color: "#858889" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Waiting for admin approval
          </div>
        </div>

        <p className="mt-5 text-[12px]" style={{ color: "#5d6566" }}>
          Reach out to your NEO Marketing Hub admin if you need urgent access.
        </p>

        <form action="/api/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="w-full rounded-lg py-2.5 text-[13px] font-semibold transition hover:brightness-110"
            style={{ background: "#14375a", color: "#a8aaab", border: "1px solid #1d4368" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
