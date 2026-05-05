import { TopBar } from "@/components/topbar/TopBar";
import { ActionItemsBoard } from "@/components/actions/ActionItemsBoard";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export default async function ActionItemsPage() {
  await requireAuth();

  let items: Parameters<typeof ActionItemsBoard>[0]["items"] = [];
  let stats = { open: 0, dueThisWeek: 0, completed: 0, avgDays: 3 };

  try {
    const rawItems = await db.actionItem.findMany({
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
        ? {
            id: a.assignee.id,
            name: a.assignee.name,
            color: a.assignee.color,
            initials: a.assignee.initials,
          }
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
    stats.dueThisWeek = rawItems.filter(
      (a) => a.dueDate && a.dueDate <= weekEnd && a.status !== "DONE"
    ).length;
    stats.completed = rawItems.filter((a) => a.status === "DONE").length;
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar
        title="Action Items"
        subtitle="Every action item across all meetings"
        primaryAction="+ New action"
      />
      <div className="mt-6">
        <ActionItemsBoard items={items} stats={stats} />
      </div>
    </>
  );
}
