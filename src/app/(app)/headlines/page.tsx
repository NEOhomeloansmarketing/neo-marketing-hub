import { TopBar } from "@/components/topbar/TopBar";
import { HeadlinesView } from "@/components/headlines/HeadlinesView";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function HeadlinesPage() {
  await requireAuth();

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, initials: true, color: true },
    orderBy: { name: "asc" },
  }).catch(() => []);

  return (
    <>
      <TopBar
        title="Headlines"
        subtitle="Team wins, issues &amp; news items"
      />
      <div className="mt-6">
        <HeadlinesView users={users} />
      </div>
    </>
  );
}
