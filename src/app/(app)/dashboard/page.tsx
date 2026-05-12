import { TopBar } from "@/components/topbar/TopBar";
import { StatCard } from "@/components/ui/StatCard";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { getActiveTeamId } from "@/lib/team-context";
import { getDudaDashboardStats } from "@/lib/duda-stats";
import { getGscDashboardStats } from "@/lib/gsc-stats";
import Link from "next/link";

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const positive = delta >= 0;
  return (
    <span
      className="text-[10px] font-semibold"
      style={{ color: positive ? "#22c55e" : "#f43f5e" }}
    >
      {positive ? "+" : ""}{delta}% vs prev 30d
    </span>
  );
}

export default async function DashboardPage() {
  await requireAuth();

  let stats = {
    openTasks: 0,
    openActions: 0,
    upcomingMeetings: 0,
    totalTools: 0,
    totalAdvisors: 0,
    totalIdeas: 0,
    openRequests: 0,
    newRequests: 0,
    activeCampaigns: 0,
  };

  let recentMeetings: {
    id: string;
    title: string;
    scheduledAt: Date;
    durationMinutes: number;
    actionItems: { status: string }[];
  }[] = [];

  let recentRequests: {
    id: string;
    title: string;
    requestType: string;
    status: string;
    advisorName: string | null;
    createdAt: Date;
  }[] = [];

  let recentActions: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    assigneeName?: string;
  }[] = [];

  const activeTeamId = await getActiveTeamId();
  const teamFilter = activeTeamId ? { OR: [{ teamId: activeTeamId }, { teamId: null }] } : {};

  // Fetch external stats in parallel with DB queries
  const [dudaStats, gscStats] = await Promise.all([
    getDudaDashboardStats().catch(() => null),
    getGscDashboardStats().catch(() => null),
  ]);

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [tasks, actions, meetings, tools, advisors, ideas, openReqs, newReqs, campaigns] = await Promise.all([
      db.task.count({ where: { ...teamFilter, status: { not: "DONE" } } }),
      db.actionItem.count({ where: { ...teamFilter, status: { not: "DONE" } } }),
      db.meeting.count({ where: { ...teamFilter, scheduledAt: { gte: now }, status: "UPCOMING" } }),
      db.tool.count({ where: teamFilter }),
      db.advisor.count({ where: { ...teamFilter, status: "ACTIVE" } }),
      db.idea.count({ where: { ...teamFilter, status: { not: "ARCHIVED" } } }),
      db.marketingRequest.count({ where: { status: { notIn: ["DELIVERED", "ARCHIVED"] } } }),
      db.marketingRequest.count({ where: { status: "NEW" } }),
      db.campaign.count({ where: { month: currentMonth, year: currentYear } }).catch(() => 0),
    ]);

    stats = {
      openTasks: tasks,
      openActions: actions,
      upcomingMeetings: meetings,
      totalTools: tools,
      totalAdvisors: advisors,
      totalIdeas: ideas,
      openRequests: openReqs,
      newRequests: newReqs,
      activeCampaigns: campaigns,
    };

    recentRequests = await db.marketingRequest.findMany({
      where: { status: { notIn: ["DELIVERED", "ARCHIVED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, requestType: true, status: true, advisorName: true, createdAt: true },
    });

    recentMeetings = await db.meeting.findMany({
      take: 5,
      where: teamFilter,
      orderBy: { scheduledAt: "desc" },
      include: { actionItems: true },
    });

    const recentActionItems = await db.actionItem.findMany({
      take: 5,
      where: { ...teamFilter, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
      include: { assignee: true },
    });

    recentActions = recentActionItems.map((a: { id: string; title: string; status: string; priority: string; dueDate: Date | null; assignee: { name: string } | null }) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      priority: a.priority,
      dueDate: a.dueDate,
      assigneeName: a.assignee?.name,
    }));
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Snapshot of your team's marketing operations"
      />
      <div className="mt-6 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-12 gap-3">
          <StatCard span={4} label="Open tasks" value={String(stats.openTasks)} delta="across team" />
          <StatCard span={4} label="Action items" value={String(stats.openActions)} delta="needs attention" tone="indigo" />
          <StatCard span={4} label="Upcoming meetings" value={String(stats.upcomingMeetings)} delta="this week" tone="green" />
          <StatCard span={4} label="Active advisors" value={String(stats.totalAdvisors)} delta="in compliance" tone="green" />
          <StatCard span={4} label="Open requests" value={String(stats.openRequests)} delta="in pipeline" tone="indigo" />
          <StatCard span={4} label="New requests" value={String(stats.newRequests)} delta="need review" />
        </div>

        {/* Digital Presence — Duda + GSC */}
        {(dudaStats || gscStats) && (
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#5d6566" }}>
              Digital Presence · Last 30 days
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {/* Duda stats */}
              {dudaStats && (
                <>
                  <div className="col-span-2 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Matrix Visitors</div>
                    <div className="mt-1 text-[24px] font-bold tabular-nums leading-none" style={{ color: "#5bcbf5" }}>
                      {dudaStats.visitors30.toLocaleString()}
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      <DeltaBadge delta={dudaStats.visitorsDelta} />
                      <div className="text-[10px]" style={{ color: "#5d6566" }}>
                        7d: {dudaStats.visitors7.toLocaleString()} · {dudaStats.activeSites}/{dudaStats.totalSites} active
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Matrix Visits</div>
                    <div className="mt-1 text-[24px] font-bold tabular-nums leading-none" style={{ color: "#6366f1" }}>
                      {dudaStats.visits30.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-[10px]" style={{ color: "#5d6566" }}>across all sites</div>
                  </div>
                  <div className="col-span-2 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Page Views</div>
                    <div className="mt-1 text-[24px] font-bold tabular-nums leading-none" style={{ color: "#a855f7" }}>
                      {dudaStats.pageViews30.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-[10px]" style={{ color: "#5d6566" }}>Matrix network total</div>
                  </div>
                </>
              )}

              {/* GSC stats */}
              {gscStats && (
                <>
                  <div className="col-span-2 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Organic Clicks</div>
                    <div className="mt-1 text-[24px] font-bold tabular-nums leading-none" style={{ color: "#22c55e" }}>
                      {gscStats.clicks.toLocaleString()}
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      <DeltaBadge delta={gscStats.clicksDelta} />
                      <div className="text-[10px]" style={{ color: "#5d6566" }}>Search Console</div>
                    </div>
                  </div>
                  <div className="col-span-2 rounded-lg p-4" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#858889" }}>Impressions</div>
                    <div className="mt-1 text-[24px] font-bold tabular-nums leading-none" style={{ color: "#f59e0b" }}>
                      {gscStats.impressions.toLocaleString()}
                    </div>
                    <div className="mt-1.5 text-[10px]" style={{ color: "#5d6566" }}>
                      CTR {gscStats.ctr}% · Pos {gscStats.position}
                    </div>
                  </div>
                </>
              )}

              {/* Placeholder if only one source */}
              {dudaStats && !gscStats && (
                <Link
                  href="/analytics?tab=search"
                  className="col-span-2 rounded-lg p-4 flex flex-col justify-between transition hover:opacity-90"
                  style={{ background: "#061320", border: "1px dashed #1d4368" }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#5d6566" }}>Search Console</div>
                  <div className="mt-3 text-[12px] font-medium" style={{ color: "#5bcbf5" }}>Connect →</div>
                  <div className="text-[10px]" style={{ color: "#5d6566" }}>See organic clicks & rankings</div>
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-5">
          {/* Recent meetings */}
          <div className="col-span-12 lg:col-span-7">
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid #1d4368" }}
              >
                <div
                  className="text-[12px] font-semibold uppercase"
                  style={{ color: "#858889", letterSpacing: "0.12em" }}
                >
                  Recent meetings
                </div>
                <Link
                  href="/meetings"
                  className="text-[11.5px] font-medium"
                  style={{ color: "#5bcbf5" }}
                >
                  View all →
                </Link>
              </div>
              {recentMeetings.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: "#858889" }}>
                  No meetings yet.{" "}
                  <Link href="/meetings/new" style={{ color: "#5bcbf5" }}>
                    Schedule one.
                  </Link>
                </div>
              ) : (
                recentMeetings.map((m, i) => (
                  <Link
                    key={m.id}
                    href={`/meetings/${m.id}`}
                    className="flex items-center justify-between px-4 py-3 transition hover:bg-white/[0.02]"
                    style={{
                      borderBottom: i === recentMeetings.length - 1 ? "none" : "1px solid #1d4368",
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-slate-100">
                        {m.title}
                      </div>
                      <div className="text-[11px]" style={{ color: "#858889" }}>
                        {m.scheduledAt.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {m.durationMinutes}m
                      </div>
                    </div>
                    <div
                      className="text-[11px] font-medium tabular-nums"
                      style={{ color: "#a8aaab" }}
                    >
                      {m.actionItems.filter((a) => a.status === "DONE").length}/
                      {m.actionItems.length} actions
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Top action items */}
          <div className="col-span-12 lg:col-span-5">
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid #1d4368" }}
              >
                <div
                  className="text-[12px] font-semibold uppercase"
                  style={{ color: "#858889", letterSpacing: "0.12em" }}
                >
                  Open action items
                </div>
                <Link
                  href="/actions"
                  className="text-[11.5px] font-medium"
                  style={{ color: "#5bcbf5" }}
                >
                  View all →
                </Link>
              </div>
              {recentActions.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: "#858889" }}>
                  No open action items.
                </div>
              ) : (
                recentActions.map((a, i) => {
                  const priorityColor =
                    a.priority === "HIGH"
                      ? "#fca5a5"
                      : a.priority === "MEDIUM"
                        ? "#fcd34d"
                        : "#94a3b8";
                  return (
                    <div
                      key={a.id}
                      className="px-4 py-3 transition hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          i === recentActions.length - 1
                            ? "none"
                            : "1px solid #1d4368",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-[12.5px] font-medium text-slate-100">
                          {a.title}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-1.5 py-[2px] text-[10px] font-semibold"
                          style={{
                            background: priorityColor + "20",
                            color: priorityColor,
                          }}
                        >
                          {a.priority.toLowerCase()}
                        </span>
                      </div>
                      <div
                        className="mt-0.5 flex items-center gap-2 text-[10.5px]"
                        style={{ color: "#858889" }}
                      >
                        {a.assigneeName && <span>{a.assigneeName}</span>}
                        {a.dueDate && (
                          <span>
                            · Due{" "}
                            {a.dueDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent marketing requests */}
        <div className="rounded-lg overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1d4368" }}>
            <div className="text-[12px] font-semibold uppercase" style={{ color: "#858889", letterSpacing: "0.12em" }}>
              Open marketing requests
            </div>
            <Link href="/requests" className="text-[11.5px] font-medium" style={{ color: "#5bcbf5" }}>
              View pipeline →
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: "#858889" }}>
              No open requests.{" "}
              <Link href="/requests" style={{ color: "#5bcbf5" }}>Go to pipeline.</Link>
            </div>
          ) : (
            recentRequests.map((r, i) => {
              const statusColor: Record<string, string> = {
                NEW: "#5bcbf5", IN_REVIEW: "#f59e0b", IN_PRODUCTION: "#6366f1",
                READY_FOR_REVIEW: "#a855f7", DELIVERED: "#22c55e",
              };
              const statusLabel: Record<string, string> = {
                NEW: "New", IN_REVIEW: "In Review", IN_PRODUCTION: "In Production",
                READY_FOR_REVIEW: "Ready", DELIVERED: "Delivered",
              };
              const color = statusColor[r.status] ?? "#858889";
              return (
                <Link
                  key={r.id}
                  href="/requests"
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.02]"
                  style={{ borderBottom: i === recentRequests.length - 1 ? "none" : "1px solid #1d4368" }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-slate-100">{r.title}</div>
                    <div className="mt-0.5 text-[11px]" style={{ color: "#858889" }}>
                      {r.advisorName ?? "Manual"}{r.requestType ? ` · ${r.requestType}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-[2px] text-[10px] font-semibold"
                    style={{ background: color + "22", color, border: `1px solid ${color}44` }}>
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-12 gap-3">
          {[
            { label: "Tools & Logins", count: stats.totalTools, href: "/tools", desc: "SaaS tools registry" },
            { label: "Advisor Compliance", count: stats.totalAdvisors, href: "/advisors", desc: "Active advisors" },
            { label: "Ideas", count: stats.totalIdeas, href: "/ideas", desc: "Active ideas" },
            { label: "Campaigns", count: stats.activeCampaigns, href: "/campaigns", desc: "This month" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="col-span-12 md:col-span-3 rounded-lg p-4 transition hover:-translate-y-0.5"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
            >
              <div className="text-[24px] font-semibold tabular-nums text-slate-100">
                {card.count}
              </div>
              <div className="mt-1 text-[13px] font-semibold text-slate-100">{card.label}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: "#858889" }}>
                {card.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
