import { TasksPageShell } from "@/components/tasks/TasksPageShell";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { getActiveTeamId } from "@/lib/team-context";

export default async function TasksPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tasks: React.ComponentProps<typeof TasksPageShell>["tasks"] = [];
  let teamMembers: React.ComponentProps<typeof TasksPageShell>["teamMembers"] = [];
  let currentUserId = "";

  try {
    const dbUser = await getOrCreateDbUser(user);
    currentUserId = dbUser?.id ?? "";

    const activeTeamId = await getActiveTeamId();
    const rawTasks = await db.task.findMany({
      where: activeTeamId ? { teamId: activeTeamId } : undefined,
      include: { owner: true, followers: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });

    tasks = rawTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      ownerId: t.ownerId,
      ownerName: t.owner.name,
      ownerColor: t.owner.color,
      ownerInitials: t.owner.initials,
      projectId: t.projectId,
      dueBucket: t.dueBucket ?? "later",
      dueDate: t.dueDate?.toISOString() ?? null,
      status: t.status,
      priority: t.priority,
      scope: t.scope,
      followers: t.followers.map((f) => ({
        id: f.user.id,
        name: f.user.name,
        color: f.user.color,
        initials: f.user.initials,
      })),
    }));

    const users = await db.user.findMany({
      where: {
        isActive: true,
        ...(activeTeamId ? { teams: { some: { teamId: activeTeamId } } } : {}),
      },
      select: { id: true, name: true, color: true, initials: true, role: true },
      orderBy: { name: "asc" },
    });
    teamMembers = users.map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      initials: u.initials,
      role: u.role,
    }));
  } catch {
    // DB not ready
  }

  return (
    <TasksPageShell tasks={tasks} teamMembers={teamMembers} currentUserId={currentUserId} />
  );
}
