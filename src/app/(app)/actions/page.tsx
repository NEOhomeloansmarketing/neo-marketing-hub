import { ActionsPageShell } from "@/components/actions/ActionsPageShell";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { getActiveTeamId } from "@/lib/team-context";

export default async function ActionItemsPage() {
  await requireAuth();

  const activeTeamId = await getActiveTeamId();

  let items: React.ComponentProps<typeof ActionsPageShell>["items"] = [];
  let stats = { open: 0, dueThisWeek: 0, completed: 0, avgDays: 3 };

  try {
    const rawItems = await db.actionItem.findMany({
      where: activeTeamId ? { OR: [{ teamId: activeTeamId }, { teamId: null }] } : undefined,
      include: {
        assignee: true,
        meeting: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    items = rawItems.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      priority: a.priority,
      assignee: a.assignee
        ? { id: a.assignee.id, name: a.assignee.name, color: a.assignee.color, initials: a.assignee.initials }
        : null,
      dueDate: a.dueDate?.toISOString() ?? null,
      meetingId: a.meetingId ?? null,
      meetingTitle: a.meeting?.title ?? null,
      source: a.source,
      createdAt: a.createdAt.toISOString(),
    }));

    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    stats.open = rawItems.filter((a) => a.status !== "DONE").length;
    stats.dueThisWeek = rawItems.filter((a) => a.dueDate && a.dueDate <= weekEnd && a.status !== "DONE").length;
    stats.completed = rawItems.filter((a) => a.status === "DONE").length;
  } catch {
    // DB not ready
  }

  return <ActionsPageShell items={items} stats={stats} />;
}
