import { TopBar } from "@/components/topbar/TopBar";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { AnalyticsTabs } from "@/components/analytics/AnalyticsTabs";
import type { TasksAnalyticsStats, WeeklySummaryData } from "@/components/analytics/TasksAnalytics";

export default async function AnalyticsPage() {
  await requireAuth();

  const now = new Date();

  // ── Week boundaries (Mon–Sun) ────────────────────────────────────────────
  function getWeekStart(d: Date): Date {
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const ws = new Date(d);
    ws.setDate(ws.getDate() + diff);
    ws.setHours(0, 0, 0, 0);
    return ws;
  }
  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const nextWeekEnd = new Date(now);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  // ── Task Analytics ──────────────────────────────────────────────────────
  const weekEnd = new Date(thisWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${thisWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  let taskStats: TasksAnalyticsStats = {
    weekLabel,
    completedThisWeek: 0,
    completedLastWeek: 0,
    totalOpen: 0,
    overdue: 0,
    highPriorityOpen: 0,
    byPerson: [],
    weeklyTrend: [],
    priorityBreakdown: [],
    dueSoon: [],
  };

  try {
    const allTasks = await db.task.findMany({
      include: { owner: true },
      orderBy: { updatedAt: "desc" },
    });

    const completedThisWeek = allTasks.filter(
      (t) => t.status === "DONE" && t.updatedAt >= thisWeekStart && t.updatedAt <= now
    );
    const completedLastWeek = allTasks.filter(
      (t) => t.status === "DONE" && t.updatedAt >= lastWeekStart && t.updatedAt < thisWeekStart
    );
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const openTasks = allTasks.filter((t) => t.status !== "DONE");
    const overdueTasks = openTasks.filter((t) =>
      t.dueDate ? t.dueDate < startOfToday : t.dueBucket === "yesterday"
    );
    const dueSoon = openTasks.filter((t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate <= nextWeekEnd);

    taskStats.completedThisWeek = completedThisWeek.length;
    taskStats.completedLastWeek = completedLastWeek.length;
    taskStats.totalOpen = openTasks.length;
    taskStats.overdue = overdueTasks.length;
    taskStats.highPriorityOpen = openTasks.filter((t) => t.priority === "HIGH").length;

    // By person
    const personMap = new Map<string, typeof taskStats.byPerson[0]>();
    for (const t of allTasks) {
      if (!personMap.has(t.ownerId)) {
        personMap.set(t.ownerId, {
          id: t.ownerId,
          name: t.owner.name,
          color: t.owner.color ?? undefined,
          initials: t.owner.initials ?? undefined,
          completedThisWeek: 0,
          open: 0,
          overdue: 0,
          completedTasks: [],
        });
      }
      const p = personMap.get(t.ownerId)!;
      if (t.status === "DONE" && t.updatedAt >= thisWeekStart && t.updatedAt <= now) {
        p.completedThisWeek++;
        p.completedTasks.push({ id: t.id, title: t.title, priority: t.priority, completedAt: t.updatedAt.toISOString() });
      } else if (t.status !== "DONE") {
        p.open++;
        if (t.dueBucket === "yesterday") p.overdue++;
      }
    }
    taskStats.byPerson = Array.from(personMap.values());

    // Priority breakdown (completed this week vs still open)
    for (const priority of ["HIGH", "MEDIUM", "LOW"]) {
      taskStats.priorityBreakdown.push({
        priority,
        completed: completedThisWeek.filter((t) => t.priority === priority).length,
        open: openTasks.filter((t) => t.priority === priority).length,
      });
    }

    // 8-week trend
    taskStats.weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const ws = new Date(thisWeekStart);
      ws.setDate(ws.getDate() - 7 * (7 - i));
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      return {
        label: ws.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
        completed: allTasks.filter((t) => t.status === "DONE" && t.updatedAt >= ws && t.updatedAt < we).length,
        created: allTasks.filter((t) => t.createdAt >= ws && t.createdAt < we).length,
      };
    });

    // Due soon (sorted by date)
    taskStats.dueSoon = dueSoon
      .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
      .slice(0, 15)
      .map((t) => ({
        id: t.id,
        title: t.title,
        ownerName: t.owner.name,
        dueDate: t.dueDate!.toISOString(),
        priority: t.priority,
      }));
  } catch { /* DB not ready */ }

  // ── Marketing Requests ──────────────────────────────────────────────────
  let requestStats = {
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

  // ── Advisor Compliance ──────────────────────────────────────────────────
  let complianceStats = {
    total: 0,
    active: 0,
    inactive: 0,
    checklist: {
      auditForm: 0,
      matrix: 0,
      canva: 0,
      socialTool: 0,
    },
    channels: [] as { platform: string; label: string; count: number }[],
    byLeader: [] as { leader: string; total: number; auditForm: number; matrix: number; canva: number; socialTool: number; weekIncrease: { auditForm: number; matrix: number; canva: number; socialTool: number } }[],
    weeklyAdded: [] as { label: string; count: number }[],
    weeklyIncrease: [] as { label: string; auditForm: number; matrix: number; canva: number; socialTool: number }[],
  };

  try {
    // Marketing requests
    const allRequests = await db.marketingRequest.findMany({ orderBy: { createdAt: "asc" } });

    requestStats.total = allRequests.length;
    requestStats.newCount = allRequests.filter((r) => r.status === "NEW").length;
    requestStats.inProgress = allRequests.filter((r) =>
      ["IN_REVIEW", "IN_PRODUCTION", "READY_FOR_REVIEW"].includes(r.status)
    ).length;
    requestStats.delivered = allRequests.filter((r) => r.status === "DELIVERED").length;

    const deliveredItems = allRequests.filter((r) => r.status === "DELIVERED");
    if (deliveredItems.length > 0) {
      const totalDays = deliveredItems.reduce(
        (sum, r) => sum + (r.updatedAt.getTime() - r.createdAt.getTime()) / 86400000,
        0
      );
      requestStats.avgCompletionDays = totalDays / deliveredItems.length;
    }

    const typeMap = new Map<string, number>();
    for (const r of allRequests) {
      const t = r.requestType || "Other";
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    }
    requestStats.byType = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const advisorMap = new Map<string, number>();
    for (const r of allRequests) {
      const name = r.advisorName?.trim() || "Unknown";
      advisorMap.set(name, (advisorMap.get(name) ?? 0) + 1);
    }
    requestStats.byAdvisor = Array.from(advisorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const statusOrder = ["NEW", "IN_REVIEW", "IN_PRODUCTION", "READY_FOR_REVIEW", "DELIVERED", "ARCHIVED"];
    const statusMap = new Map<string, number>();
    for (const r of allRequests) statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
    requestStats.byStatus = statusOrder
      .filter((s) => statusMap.has(s))
      .map((s) => ({ status: s, count: statusMap.get(s)! }));

    requestStats.weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - 7 * (7 - i));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const count = allRequests.filter((r) => r.createdAt >= weekStart && r.createdAt < weekEnd).length;
      const label = weekEnd.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      return { label, count };
    });
  } catch { /* DB not ready */ }

  try {
    // Advisor compliance
    const allAdvisors = await db.advisor.findMany({
      include: { channels: true },
      orderBy: { createdAt: "asc" },
    });

    complianceStats.total = allAdvisors.length;
    complianceStats.active = allAdvisors.filter((a) => a.status === "ACTIVE").length;
    complianceStats.inactive = allAdvisors.filter((a) => a.status === "INACTIVE").length;

    const af = allAdvisors.filter((a) => !!a.auditFormUrl).length;
    const mx = allAdvisors.filter((a) => !!a.matrixUrl).length;
    const cv = allAdvisors.filter((a) => !!a.canvaUrl).length;
    const st = allAdvisors.filter((a) => !!a.socialToolUrl).length;

    complianceStats.checklist = { auditForm: af, matrix: mx, canva: cv, socialTool: st };

    // Channel adoption
    const PLATFORM_LABELS: Record<string, string> = {
      WEBSITE: "Website", FACEBOOK: "Facebook", INSTAGRAM: "Instagram",
      LINKEDIN: "LinkedIn", TIKTOK: "TikTok", YOUTUBE: "YouTube",
      GOOGLE_BUSINESS: "Google Business", ZILLOW: "Zillow", YELP: "Yelp", X: "X / Twitter",
    };
    const platformCounts = new Map<string, number>();
    for (const a of allAdvisors) {
      const seen = new Set<string>();
      for (const ch of a.channels) {
        if (!seen.has(ch.platform)) { seen.add(ch.platform); platformCounts.set(ch.platform, (platformCounts.get(ch.platform) ?? 0) + 1); }
      }
    }
    complianceStats.channels = Object.entries(PLATFORM_LABELS)
      .map(([platform, label]) => ({ platform, label, count: platformCounts.get(platform) ?? 0 }))
      .sort((a, b) => b.count - a.count);

    // By leader
    const leaderMap = new Map<string, typeof allAdvisors>();
    for (const a of allAdvisors) {
      const key = a.leader?.trim() || "Unassigned";
      if (!leaderMap.has(key)) leaderMap.set(key, []);
      leaderMap.get(key)!.push(a);
    }
    // Current & previous week windows for per-leader deltas
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - dayOfWeek);
    currentWeekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    complianceStats.byLeader = Array.from(leaderMap.entries())
      .map(([leader, advisors]) => {
        const inCurrent = advisors.filter((a) => a.updatedAt >= currentWeekStart && a.updatedAt <= now);
        const inPrev = advisors.filter((a) => a.updatedAt >= prevWeekStart && a.updatedAt < currentWeekStart);
        return {
          leader,
          total: advisors.length,
          auditForm: advisors.filter((a) => !!a.auditFormUrl).length,
          matrix: advisors.filter((a) => !!a.matrixUrl).length,
          canva: advisors.filter((a) => !!a.canvaUrl).length,
          socialTool: advisors.filter((a) => !!a.socialToolUrl).length,
          weekIncrease: {
            auditForm: inCurrent.filter((a) => !!a.auditFormUrl).length - inPrev.filter((a) => !!a.auditFormUrl).length,
            matrix: inCurrent.filter((a) => !!a.matrixUrl).length - inPrev.filter((a) => !!a.matrixUrl).length,
            canva: inCurrent.filter((a) => !!a.canvaUrl).length - inPrev.filter((a) => !!a.canvaUrl).length,
            socialTool: inCurrent.filter((a) => !!a.socialToolUrl).length - inPrev.filter((a) => !!a.socialToolUrl).length,
          },
        };
      })
      .sort((a, b) => b.total - a.total);

    // Weekly advisors added (last 8 weeks)
    complianceStats.weeklyAdded = Array.from({ length: 8 }, (_, i) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - 7 * (7 - i));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const count = allAdvisors.filter((a) => a.createdAt >= weekStart && a.createdAt < weekEnd).length;
      const label = weekEnd.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      return { label, count };
    });

    // Weekly sign-up increases — starts from launch week (Sun May 10 2026) and grows by one column every Sunday
    const CHART_START = new Date("2026-05-10T00:00:00"); // Sunday of launch week
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    const weeksElapsed = Math.floor((now.getTime() - CHART_START.getTime()) / MS_PER_WEEK);
    const weeksToShow = Math.max(1, weeksElapsed + 1);

    complianceStats.weeklyIncrease = Array.from({ length: weeksToShow }, (_, i) => {
      const weekStart = new Date(CHART_START.getTime() + i * MS_PER_WEEK);
      const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK);
      const inWindow = allAdvisors.filter((a) => a.updatedAt >= weekStart && a.updatedAt < weekEnd);
      const label = weekStart.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      return {
        label,
        auditForm: inWindow.filter((a) => !!a.auditFormUrl).length,
        matrix: inWindow.filter((a) => !!a.matrixUrl).length,
        canva: inWindow.filter((a) => !!a.canvaUrl).length,
        socialTool: inWindow.filter((a) => !!a.socialToolUrl).length,
      };
    });
  } catch { /* DB not ready */ }

  // ── Weekly AI Summary (cached) ────────────────────────────────────────────
  let initialSummary: WeeklySummaryData | null = null;
  try {
    const teamId = await getActiveTeamId();
    const cached = await db.weeklySummary.findFirst({
      where: { weekStart: thisWeekStart, ...(teamId ? { teamId } : {}) },
      orderBy: { generatedAt: "desc" },
    });
    if (cached) {
      initialSummary = {
        id: cached.id,
        prose: cached.prose,
        highlights: cached.highlights,
        generatedAt: cached.generatedAt.toISOString(),
      };
    }
  } catch { /* table not ready yet */ }

  return (
    <>
      <TopBar title="Analytics" subtitle="Reporting across requests, compliance, and team activity" />
      <div className="mt-6">
        <AnalyticsTabs requestStats={requestStats} complianceStats={complianceStats} taskStats={taskStats} initialSummary={initialSummary} />
      </div>
    </>
  );
}
