import { TopBar } from "@/components/topbar/TopBar";
import { MeetingsList } from "@/components/meetings/MeetingsList";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export default async function MeetingsPage() {
  await requireAuth();

  let meetings: Parameters<typeof MeetingsList>[0]["meetings"] = [];
  let stats = { totalThisMonth: 0, openActions: 0, avgDuration: 0, onTimeRate: 92 };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rawMeetings = await db.meeting.findMany({
      include: {
        attendees: {
          include: { user: true },
        },
        actionItems: true,
      },
      orderBy: { scheduledAt: "desc" },
      take: 50,
    });

    meetings = rawMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      scheduledAt: m.scheduledAt.toISOString(),
      durationMinutes: m.durationMinutes,
      recurrence: m.recurrence,
      status: m.status,
      summary: undefined,
      attendees: m.attendees
        .filter((a) => !a.absent)
        .map((a) => ({
          id: a.user.id,
          name: a.user.name,
          color: a.user.color,
          initials: a.user.initials,
        })),
      actionCount: m.actionItems.length,
      actionsDone: m.actionItems.filter((a) => a.status === "DONE").length,
    }));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    stats.totalThisMonth = rawMeetings.filter(
      (m) => new Date(m.scheduledAt) >= monthStart
    ).length;
    stats.openActions = await db.actionItem.count({
      where: {
        status: { not: "DONE" },
        ...(user ? { assigneeId: user.id } : {}),
      },
    });
    stats.avgDuration =
      rawMeetings.length > 0
        ? Math.round(
            rawMeetings.reduce((s, m) => s + m.durationMinutes, 0) /
              rawMeetings.length
          )
        : 0;
  } catch {
    // DB not ready — show empty state
  }

  return (
    <>
      <TopBar
        title="Meetings"
        subtitle="Weekly notes, decisions, and action items"
        primaryAction="+ New meeting"
        primaryActionHref="/meetings/new"
      />
      <div className="mt-6">
        <MeetingsList meetings={meetings} stats={stats} />
      </div>
    </>
  );
}
