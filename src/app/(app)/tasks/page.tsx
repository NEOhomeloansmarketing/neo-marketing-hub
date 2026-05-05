import { TopBar } from "@/components/topbar/TopBar";
import { TasksView } from "@/components/tasks/TasksView";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export default async function TasksPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tasks: Parameters<typeof TasksView>[0]["tasks"] = [];
  let teamMembers: Parameters<typeof TasksView>[0]["teamMembers"] = [];
  let currentUserId = "";

  try {
    let dbUser = null;
    if (user?.email) {
      dbUser = await db.user.findUnique({ where: { email: user.email } });
    }
    currentUserId = dbUser?.id ?? "";

    const rawTasks = await db.task.findMany({
      include: {
        owner: true,
        followers: { include: { user: true } },
      },
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
      where: { isActive: true },
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
    <>
      <TopBar
        title="My Tasks"
        subtitle="Personal queue and team assignments"
        primaryAction="+ New task"
      />
      <div className="mt-6">
        <TasksView tasks={tasks} teamMembers={teamMembers} currentUserId={currentUserId} />
      </div>
    </>
  );
}
