import { TopBar } from "@/components/topbar/TopBar";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export default async function MembersPage() {
  await requireAuth();

  let members: { id: string; name: string; email: string; color: string; initials: string; role: string }[] = [];

  try {
    const users = await db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, color: true, initials: true, role: true },
    });
    members = users;
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar
        title="Team Members"
        subtitle="Everyone on the NEO marketing team"
        primaryAction="+ Invite member"
      />
      <div className="mt-6">
        {members.length === 0 ? (
          <div className="py-16 text-center text-[13px]" style={{ color: "#858889" }}>
            No team members yet.
          </div>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
          >
            {/* Header */}
            <div
              className="grid items-center gap-3 px-4 py-2.5"
              style={{
                gridTemplateColumns: "40px 1fr 200px 100px",
                borderBottom: "1px solid #1d4368",
              }}
            >
              {["", "Name", "Email", "Role"].map((h, i) => (
                <div
                  key={i}
                  className="text-[10.5px] font-semibold uppercase tracking-widest"
                  style={{ color: "#5d6566" }}
                >
                  {h}
                </div>
              ))}
            </div>
            {members.map((m, i) => (
              <div
                key={m.id}
                className="grid items-center gap-3 px-4 py-3"
                style={{
                  gridTemplateColumns: "40px 1fr 200px 100px",
                  borderBottom: i === members.length - 1 ? "none" : "1px solid #1d4368",
                }}
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold"
                  style={{ background: m.color, color: "#fff" }}
                >
                  {m.initials}
                </span>
                <span className="text-[13px] font-medium text-slate-100">{m.name}</span>
                <span className="text-[12px]" style={{ color: "#a8aaab" }}>{m.email}</span>
                <span
                  className="inline-flex w-fit items-center rounded-full px-2 py-[2px] text-[10.5px] font-semibold"
                  style={{
                    background: "rgba(91,203,245,0.12)",
                    color: "#5bcbf5",
                    border: "1px solid rgba(91,203,245,0.25)",
                  }}
                >
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
