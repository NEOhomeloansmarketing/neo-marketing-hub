import { TeamsPageShell } from "@/components/teams/TeamsPageShell";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export default async function TeamsPage() {
  const user = await getApiUser();
  if (!user) return null;

  const dbUser = await getOrCreateDbUser(user);

  let teams: any[] = [];
  let allUsers: any[] = [];

  try {
    if (dbUser) {
      const memberships = await db.teamMember.findMany({
        where: { userId: dbUser.id },
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true, color: true, initials: true } },
                },
              },
            },
          },
        },
      });
      teams = memberships.map((m) => m.team);
    }

    allUsers = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, color: true, initials: true },
      orderBy: { name: "asc" },
    });
  } catch {
    // DB not ready
  }

  return (
    <TeamsPageShell
      initialTeams={teams}
      allUsers={allUsers}
      currentUserId={dbUser?.id ?? ""}
    />
  );
}
