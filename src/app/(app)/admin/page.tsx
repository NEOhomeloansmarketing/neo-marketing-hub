import { redirect } from "next/navigation";
import { TopBar } from "@/components/topbar/TopBar";
import { AdminView } from "@/components/admin/AdminView";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export default async function AdminPage() {
  const user = await getApiUser();
  if (!user) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser(user);
  if (!dbUser?.isAdmin) redirect("/dashboard");

  const [teams, allUsers] = await Promise.all([
    db.team.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, color: true, initials: true, role: true, isAdmin: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      select: { id: true, name: true, email: true, color: true, initials: true, role: true, isAdmin: true, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pendingUsers = allUsers.filter((u) => !u.isActive);
  const activeUsers = allUsers.filter((u) => u.isActive);

  return (
    <>
      <TopBar
        title="Admin"
        subtitle="Manage workspaces, team members, and access"
      />
      <div className="mt-6">
        <AdminView teams={teams} users={activeUsers} pendingUsers={pendingUsers} />
      </div>
    </>
  );
}
