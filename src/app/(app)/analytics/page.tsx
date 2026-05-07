import { TopBar } from "@/components/topbar/TopBar";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { RequestsAnalytics } from "@/components/analytics/RequestsAnalytics";

export default async function AnalyticsPage() {
  await requireAuth();

  const now = new Date();

  let stats = {
    total: 0,
    newCount: 0,
    inProgress: 0,
    delivered: 0,
    avgCompletionDays: null as number | null,
    byType: [] as { type: string; count: number }[],
    byAdvisor: [] as { name: string; count: number }[],
    byStatus: [] as { status: string; count: number }[],
    weeklyTrend: [] as { label: string; count: number }[],
  };

  try {
    const all = await db.marketingRequest.findMany({ orderBy: { createdAt: "asc" } });

    stats.total = all.length;
    stats.newCount = all.filter((r) => r.status === "NEW").length;
    stats.inProgress = all.filter((r) =>
      ["IN_REVIEW", "IN_PRODUCTION", "READY_FOR_REVIEW"].includes(r.status)
    ).length;
    stats.delivered = all.filter((r) => r.status === "DELIVERED").length;

    // Avg completion time for delivered requests (createdAt → updatedAt)
    const deliveredItems = all.filter((r) => r.status === "DELIVERED");
    if (deliveredItems.length > 0) {
      const totalDays = deliveredItems.reduce(
        (sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()) / 86400000,
        0
      );
      stats.avgCompletionDays = totalDays / deliveredItems.length;
    }

    // By type
    const typeMap = new Map<string, number>();
    for (const r of all) {
      const t = r.requestType || "Other";
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    }
    stats.byType = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // By advisor
    const advisorMap = new Map<string, number>();
    for (const r of all) {
      const name = r.advisorName?.trim() || "Unknown";
      advisorMap.set(name, (advisorMap.get(name) ?? 0) + 1);
    }
    stats.byAdvisor = Array.from(advisorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By status
    const statusOrder = ["NEW", "IN_REVIEW", "IN_PRODUCTION", "READY_FOR_REVIEW", "DELIVERED", "ARCHIVED"];
    const statusMap = new Map<string, number>();
    for (const r of all) statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    stats.byStatus = statusOrder
      .filter((s) => statusMap.has(s))
      .map((s) => ({ status: s, count: statusMap.get(s)! }));

    // Weekly trend — last 8 weeks
    stats.weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - 7 * (7 - i));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const count = all.filter((r) => r.createdAt >= weekStart && r.createdAt < weekEnd).length;
      const label = weekEnd.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      return { label, count };
    });
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar
        title="Analytics"
        subtitle="Marketing request volume, types, and completion metrics"
      />
      <div className="mt-6">
        <RequestsAnalytics stats={stats} />
      </div>
    </>
  );
}
