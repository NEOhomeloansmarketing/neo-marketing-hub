import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { db } from "@/lib/db";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { getActiveTeamId } from "@/lib/team-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  let profile = null;
  let teams: { id: string; name: string; color: string; slug: string }[] = [];
  let isAdmin = false;

  try {
    const dbUser = await getOrCreateDbUser(user as Parameters<typeof getOrCreateDbUser>[0]);
    if (dbUser) {
      profile = dbUser;
      isAdmin = dbUser.isAdmin;
      const memberships = await db.teamMember.findMany({
        where: { userId: dbUser.id },
        include: { team: { select: { id: true, name: true, color: true, slug: true } } },
      });
      teams = memberships.map((m) => m.team);
    }
  } catch {
    // DB not yet connected
  }

  const activeTeamId = await getActiveTeamId();

  const meta = user.user_metadata;
  const displayUser = profile
    ? {
        name: profile.name,
        email: profile.email,
        role: profile.role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        color: profile.color,
        initials: profile.initials,
      }
    : {
        name: meta?.name ?? user.email?.split("@")[0] ?? "Team Member",
        email: user.email ?? "",
        role: meta?.role ?? "Member",
        color: meta?.color ?? "#5bcbf5",
        initials: (meta?.name ?? user.email ?? "?")
          .split(" ")
          .map((p: string) => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      };

  return (
    <div className="min-h-screen" style={{ background: "#061320" }}>
      <Sidebar user={displayUser} teams={teams} activeTeamId={activeTeamId} isAdmin={isAdmin} />
      <div className="flex min-h-screen flex-col" style={{ marginLeft: 220 }}>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
