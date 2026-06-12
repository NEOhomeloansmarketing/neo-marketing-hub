import { TopBar } from "@/components/topbar/TopBar";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { getActiveTeamId } from "@/lib/team-context";
import { getDudaDashboardStats } from "@/lib/duda-stats";
import { getGscDashboardStats } from "@/lib/gsc-stats";
import Link from "next/link";

// ── helpers ─────────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const positive = delta >= 0;
  return (
    <span className="text-[10px] font-semibold" style={{ color: positive ? "#22c55e" : "#f43f5e" }}>
      {positive ? "+" : ""}{delta}% vs prev 30d
    </span>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#22c55e",
};
const PRIORITY_BG: Record<string, string> = {
  HIGH: "rgba(239,68,68,0.12)", MEDIUM: "rgba(245,158,11,0.12)", LOW: "rgba(34,197,94,0.10)",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{ background: PRIORITY_BG[priority] ?? "#0a2540", color: PRIORITY_COLOR[priority] ?? "#858889" }}
    >
      {priority[0] + priority.slice(1).toLowerCase()}
    </span>
  );
}

// ── hero stat card ───────────────────────────────────────────────────────────

function HeroStat({
  label, value, sub, tone = "default", href,
}: {
  label: string; value: number; sub: string;
  tone?: "red" | "amber" | "blue" | "green" | "cyan" | "default";
  href: string;
}) {
  const tones = {
    red:     { bg: "rgba(239,68,68,0.07)",    border: "rgba(239,68,68,0.2)",   val: "#ef4444" },
    amber:   { bg: "rgba(245,158,11,0.07)",   border: "rgba(245,158,11,0.2)",  val: "#f59e0b" },
    blue:    { bg: "rgba(91,130,245,0.07)",   border: "rgba(91,130,245,0.2)",  val: "#818cf8" },
    green:   { bg: "rgba(34,197,94,0.07)",    border: "rgba(34,197,94,0.2)",   val: "#22c55e" },
    cyan:    { bg: "rgba(91,203,245,0.07)",   border: "rgba(91,203,245,0.2)",  val: "#5bcbf5" },
    default: { bg: "#0e2b48",                 border: "#1d4368",               val: "#e2e8f0" },
  };
  const t = tones[tone];
  return (
    <Link
      href={href}
      className="col-span-2 rounded-xl p-4 flex flex-col gap-1 transition hover:-translate-y-0.5"
      style={{ background: t.bg, border: `1px solid ${t.border}` }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#858889" }}>{label}</div>
      <div className="text-[30px] font-black tabular-nums leading-none" style={{ color: t.val }}>{value}</div>
      <div className="text-[10.5px]" style={{ color: "#5d6566" }}>{sub}</div>
    </Link>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  await requireAuth();

  // Shared defaults
  let counts = {
    overdue: 0, openTasks: 0, dueThisWeek: 0,
    highPriority: 0, newRequests: 0, upcomingMeetings: 0,
    totalAdvisors: 0, totalTools: 0, totalIdeas: 0, activeCampaigns: 0,
  };

  type OverdueTask = {
    id: string; title: string; priority: string;
    dueDate: Date; ownerName: string | null;
  };
  type UpcomingMeeting = {
    id: string; title: string; scheduledAt: Date; durationMinutes: number; status: string;
  };
  type OpenRequest = {
    id: string; title: string; requestType: string; status: string; advisorName: string | null; createdAt: Date;
  };

  let overdueTasks: OverdueTask[] = [];
  let upcomingMeetings: UpcomingMeeting[] = [];
  let openRequests: OpenRequest[] = [];

  const activeTeamId = await getActiveTeamId();
  const teamFilter = activeTeamId ? { OR: [{ teamId: activeTeamId }, { teamId: null }] } : {};

  const [dudaStats, gscStats] = await Promise.all([
    getDudaDashboardStats().catch(() => null),
    getGscDashboardStats().catch(() => null),
  ]);

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + 7);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
      overdueCount, openCount, dueWeekCount, highCount,
      newReqCount, meetingCount, advisorCount, toolCount, ideaCount, campaignCount,
    ] = await Promise.all([
      db.task.count({ where: { ...teamFilter, status: { not: "DONE" }, dueDate: { lt: startOfToday } } }),
      db.task.count({ where: { ...teamFilter, status: { not: "DONE" } } }),
      db.task.count({ where: { ...teamFilter, status: { not: "DONE" }, dueDate: { gte: startOfToday, lte: endOfWeek } } }),
      db.task.count({ where: { ...teamFilter, status: { not: "DONE" }, priority: "HIGH" } }),
      db.marketingRequest.count({ where: { status: "NEW" } }),
      db.meeting.count({ where: { ...teamFilter, scheduledAt: { gte: now }, status: "UPCOMING" } }),
      db.advisor.count({ where: { ...teamFilter, status: "ACTIVE" } }),
      db.tool.count({ where: teamFilter }),
      db.idea.count({ where: { ...teamFilter, status: { not: "ARCHIVED" } } }),
      db.campaign.count({ where: { month: currentMonth, year: currentYear } }).catch(() => 0),
    ]);

    counts = {
      overdue: overdueCount, openTasks: openCount, dueThisWeek: dueWeekCount,
      highPriority: highCount, newRequests: newReqCount, upcomingMeetings: meetingCount,
      totalAdvisors: advisorCount, totalTools: toolCount, totalIdeas: ideaCount,
      activeCampaigns: campaignCount,
    };

    // Overdue tasks list
    const rawOverdue = await db.task.findMany({
      where: { ...teamFilter, status: { not: "DONE" }, dueDate: { lt: startOfToday } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { owner: { select: { name: true } } },
    });
    overdueTasks = rawOverdue.map((t) => ({
      id: t.id, title: t.title, priority: t.priority,
      dueDate: t.dueDate!, ownerName: t.owner?.name ?? null,
    }));

    // Upcoming meetings
    const rawMeetings = await db.meeting.findMany({
      where: { ...teamFilter, scheduledAt: { gte: now }, status: "UPCOMING" },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    });
    upcomingMeetings = rawMeetings.map((m) => ({
      id: m.id, title: m.title, scheduledAt: m.scheduledAt,
      durationMinutes: m.durationMinutes, status: m.status,
    }));

    // Open requests
    const rawRequests = await db.marketingRequest.findMany({
      where: { status: { notIn: ["DELIVERED", "ARCHIVED"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, requestType: true, status: true, advisorName: true, createdAt: true },
    });
    openRequests = rawRequests;
  } catch {
    // DB not ready
  }

  const REQUEST_STATUS_COLOR: Record<string, string> = {
    NEW: "#5bcbf5", IN_REVIEW: "#f59e0b", IN_PRODUCTION: "#6366f1",
    READY_FOR_REVIEW: "#a855f7", DELIVERED: "#22c55e",
  };
  const REQUEST_STATUS_LABEL: Record<string, string> = {
    NEW: "New", IN_REVIEW: "In Review", IN_PRODUCTION: "In Production",
    READY_FOR_REVIEW: "Ready", DELIVERED: "Delivered",
  };

  return (
    <>
      <TopBar title="Dashboard" subtitle="Snapshot of your team's marketing operations" />
      <div className="mt-6 space-y-6">

        {/* ── Hero stats ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-3">
          <HeroStat
            label="Overdue tasks" value={counts.overdue}
            sub="past due date" tone={counts.overdue > 0 ? "red" : "default"}
            href="/tasks?tab=overdue"
          />
          <HeroStat
            label="Open tasks" value={counts.openTasks}
            sub="across team" tone="blue"
            href="/tasks"
          />
          <HeroStat
            label="Due this week" value={counts.dueThisWeek}
            sub="need to ship soon" tone={counts.dueThisWeek > 0 ? "amber" : "default"}
            href="/tasks"
          />
          <HeroStat
            label="High priority" value={counts.highPriority}
            sub="open urgent tasks" tone={counts.highPriority > 0 ? "amber" : "default"}
            href="/tasks"
          />
          <HeroStat
            label="New requests" value={counts.newRequests}
            sub="need review" tone={counts.newRequests > 0 ? "cyan" : "default"}
            href="/requests"
          />
          <HeroStat
            label="Upcoming meetings" value={counts.upcomingMeetings}
            sub="scheduled" tone="green"
            href="/meetings"
          />
        </div>

        {/* ── Digital Presence ───────────────────────────────────────── */}
        {(dudaStats || gscStats) && (
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#5d6566" }}>
              Digital Presence · Last 30 days
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
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
              {dudaStats && !gscStats && (
                <Link
                  href="/analytics?tab=search"
                  className="col-span-2 rounded-lg p-4 flex flex-col justify-between transition hover:opacity-90"
                  style={{ background: "#061320", border: "1px dashed #1d4368" }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#5d6566" }}>Search Console</div>
                  <div className="mt-3 text-[12px] font-medium" style={{ color: "#5bcbf5" }}>Connect →</div>
                  <div className="text-[10px]" style={{ color: "#5d6566" }}>See organic clicks &amp; rankings</div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Overdue tasks + Upcoming meetings ──────────────────────── */}
        <div className="grid grid-cols-12 gap-5">

          {/* Overdue tasks */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                  <span className="text-[13px] font-bold text-slate-100">Overdue Tasks</span>
                  {counts.overdue > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      {counts.overdue}
                    </span>
                  )}
                </div>
                <Link href="/tasks?tab=overdue" className="text-[11.5px] font-medium" style={{ color: "#5bcbf5" }}>
                  View all →
                </Link>
              </div>

              {overdueTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-[13px] font-semibold" style={{ color: "#22c55e" }}>All caught up!</p>
                  <p className="text-[11.5px]" style={{ color: "#5d6566" }}>No overdue tasks right now.</p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div
                    className="grid px-5 py-2 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ gridTemplateColumns: "1fr 90px 100px 80px", color: "#5d6566", borderBottom: "1px solid #1d4368", background: "#071828" }}
                  >
                    <div>Task</div>
                    <div>Assignee</div>
                    <div>Due</div>
                    <div>Priority</div>
                  </div>
                  {overdueTasks.map((t, i) => {
                    const daysLate = Math.floor((Date.now() - t.dueDate.getTime()) / 86_400_000);
                    return (
                      <Link
                        key={t.id}
                        href="/tasks?tab=overdue"
                        className="grid items-center px-5 py-3 transition hover:bg-white/[0.02]"
                        style={{
                          gridTemplateColumns: "1fr 90px 100px 80px",
                          borderBottom: i < overdueTasks.length - 1 ? "1px solid #1d4368" : "none",
                        }}
                      >
                        <span className="truncate text-[13px] font-medium text-slate-100 pr-4">{t.title}</span>
                        <span className="text-[11.5px]" style={{ color: "#a8aaab" }}>
                          {t.ownerName ? t.ownerName.split(" ")[0] : "—"}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[11.5px]" style={{ color: "#ef4444" }}>
                            {t.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span className="text-[10px]" style={{ color: "#5d6566" }}>
                            {daysLate === 0 ? "today" : `${daysLate}d late`}
                          </span>
                        </div>
                        <PriorityBadge priority={t.priority} />
                      </Link>
                    );
                  })}
                  {counts.overdue > 8 && (
                    <Link
                      href="/tasks?tab=overdue"
                      className="flex items-center justify-center gap-1.5 px-5 py-3 text-[11.5px] font-semibold transition hover:bg-white/[0.02]"
                      style={{ borderTop: "1px solid #1d4368", color: "#5bcbf5" }}
                    >
                      +{counts.overdue - 8} more overdue tasks →
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Upcoming meetings */}
          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-xl overflow-hidden h-full" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}
              >
                <span className="text-[13px] font-bold text-slate-100">Upcoming Meetings</span>
                <Link href="/meetings" className="text-[11.5px] font-medium" style={{ color: "#5bcbf5" }}>
                  View all →
                </Link>
              </div>
              {upcomingMeetings.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[12.5px]" style={{ color: "#5d6566" }}>No upcoming meetings.</p>
                  <Link href="/meetings/new" className="mt-2 block text-[12px] font-medium" style={{ color: "#5bcbf5" }}>
                    + Schedule one
                  </Link>
                </div>
              ) : (
                upcomingMeetings.map((m, i) => {
                  const isToday = m.scheduledAt.toDateString() === new Date().toDateString();
                  const isTomorrow = m.scheduledAt.toDateString() === new Date(Date.now() + 86_400_000).toDateString();
                  const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow"
                    : m.scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  return (
                    <Link
                      key={m.id}
                      href={`/meetings/${m.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-white/[0.02]"
                      style={{ borderBottom: i < upcomingMeetings.length - 1 ? "1px solid #1d4368" : "none" }}
                    >
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg text-center"
                        style={{ background: isToday ? "rgba(91,203,245,0.12)" : "#0a2540", border: `1px solid ${isToday ? "rgba(91,203,245,0.3)" : "#1d4368"}` }}
                      >
                        <div className="text-[9px] font-bold uppercase" style={{ color: isToday ? "#5bcbf5" : "#858889" }}>
                          {m.scheduledAt.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div className="text-[13px] font-black leading-none" style={{ color: isToday ? "#5bcbf5" : "#e2e8f0" }}>
                          {m.scheduledAt.getDate()}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-semibold text-slate-100">{m.title}</div>
                        <div className="mt-0.5 text-[11px]" style={{ color: isToday ? "#5bcbf5" : "#858889" }}>
                          {dayLabel} · {m.durationMinutes}m
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Open marketing requests ─────────────────────────────────── */}
        {openRequests.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: "#0e2b48", border: "1px solid #1d4368" }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #1d4368", background: "#0a2540" }}>
              <span className="text-[13px] font-bold text-slate-100">Open Marketing Requests</span>
              <Link href="/requests" className="text-[11.5px] font-medium" style={{ color: "#5bcbf5" }}>
                View pipeline →
              </Link>
            </div>
            <div className="divide-y" style={{ divideColor: "#1d4368" }}>
              {openRequests.map((r) => {
                const color = REQUEST_STATUS_COLOR[r.status] ?? "#858889";
                return (
                  <Link
                    key={r.id}
                    href="/requests"
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-slate-100">{r.title}</div>
                      <div className="mt-0.5 text-[11px]" style={{ color: "#858889" }}>
                        {r.advisorName ?? "Manual"}{r.requestType ? ` · ${r.requestType}` : ""}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                    >
                      {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Quick nav tiles ─────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-3">
          {[
            { label: "Tools & Logins",     count: counts.totalTools,     href: "/tools",     desc: "SaaS tools registry",  icon: "🔧" },
            { label: "Advisor Compliance", count: counts.totalAdvisors,  href: "/advisors",  desc: "Active advisors",      icon: "✅" },
            { label: "Ideas",              count: counts.totalIdeas,     href: "/ideas",     desc: "Active ideas",         icon: "💡" },
            { label: "Campaigns",          count: counts.activeCampaigns, href: "/campaigns", desc: "This month",          icon: "📣" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="col-span-12 md:col-span-3 rounded-xl p-4 flex items-center gap-4 transition hover:-translate-y-0.5"
              style={{ background: "#0e2b48", border: "1px solid #1d4368" }}
            >
              <span className="text-[24px]">{card.icon}</span>
              <div>
                <div className="text-[22px] font-black tabular-nums leading-none text-slate-100">{card.count}</div>
                <div className="text-[12.5px] font-semibold text-slate-100 mt-0.5">{card.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "#858889" }}>{card.desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}
