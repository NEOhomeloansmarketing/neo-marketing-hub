import { TopBar } from "@/components/topbar/TopBar";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { AnalyticsTabs } from "@/components/analytics/AnalyticsTabs";

export default async function AnalyticsPage() {
  await requireAuth();

  const now = new Date();

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
    avgCompletionPct: 0,
    checklist: {
      auditForm: 0,
      matrix: 0,
      canva: 0,
      socialTool: 0,
    },
    channels: [] as { platform: string; label: string; count: number }[],
    byLeader: [] as { leader: string; total: number; auditForm: number; matrix: number; canva: number; socialTool: number }[],
    weeklyAdded: [] as { label: string; count: number }[],
    weeklyChecklist: [] as { label: string; auditForm: number; matrix: number; canva: number; socialTool: number }[],
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

    const total = allAdvisors.length || 1;
    complianceStats.avgCompletionPct = Math.round(((af + mx + cv + st) / (total * 4)) * 100);

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
    complianceStats.byLeader = Array.from(leaderMap.entries())
      .map(([leader, advisors]) => ({
        leader,
        total: advisors.length,
        auditForm: advisors.filter((a) => !!a.auditFormUrl).length,
        matrix: advisors.filter((a) => !!a.matrixUrl).length,
        canva: advisors.filter((a) => !!a.canvaUrl).length,
        socialTool: advisors.filter((a) => !!a.socialToolUrl).length,
      }))
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

    // Weekly checklist completions — advisors updated each week (proxy for items being checked)
    complianceStats.weeklyChecklist = Array.from({ length: 8 }, (_, i) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - 7 * (7 - i));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      const inWindow = allAdvisors.filter((a) => a.updatedAt >= weekStart && a.updatedAt < weekEnd);
      const label = weekEnd.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      return {
        label,
        auditForm: inWindow.filter((a) => !!a.auditFormUrl).length,
        matrix: inWindow.filter((a) => !!a.matrixUrl).length,
        canva: inWindow.filter((a) => !!a.canvaUrl).length,
        socialTool: inWindow.filter((a) => !!a.socialToolUrl).length,
      };
    });
  } catch { /* DB not ready */ }

  return (
    <>
      <TopBar title="Analytics" subtitle="Reporting across requests, compliance, and team activity" />
      <div className="mt-6">
        <AnalyticsTabs requestStats={requestStats} complianceStats={complianceStats} />
      </div>
    </>
  );
}
