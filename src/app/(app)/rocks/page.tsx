import { TopBar } from "@/components/topbar/TopBar";
import { RocksView } from "@/components/rocks/RocksView";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function RocksPage() {
  await requireAuth();

  // Load team members for owner picker
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, initials: true, color: true },
    orderBy: { name: "asc" },
  }).catch(() => []);

  // Load available tasks for linking
  const rawTasks = await db.task.findMany({
    where: { status: { not: "DONE" } },
    select: { id: true, title: true, status: true, priority: true, dueDate: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  }).catch(() => []);
  const tasks = rawTasks.map((t) => ({
    ...t,
    dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
  }));

  return (
    <>
      <TopBar
        title="Rocks"
        subtitle="90-day priorities · EOS-style quarterly goals"
      />
      <div className="mt-6">
        <RocksView users={users} availableTasks={tasks} />
      </div>
    </>
  );
}
