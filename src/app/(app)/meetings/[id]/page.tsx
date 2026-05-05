import { notFound } from "next/navigation";
import { TopBar } from "@/components/topbar/TopBar";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export default async function MeetingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAuth();

  let meeting = null;
  try {
    meeting = await db.meeting.findUnique({
      where: { id: params.id },
      include: {
        attendees: {
          include: { user: true },
        },
        sections: { orderBy: { position: "asc" } },
        decisions: { orderBy: { position: "asc" } },
        actionItems: {
          include: { assignee: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } catch {
    // DB not ready
  }

  if (!meeting) notFound();

  const detailProps = {
    id: meeting.id,
    title: meeting.title,
    scheduledAt: meeting.scheduledAt.toISOString(),
    durationMinutes: meeting.durationMinutes,
    recurrence: meeting.recurrence,
    status: meeting.status,
    summary: undefined as string | undefined,
    sections: meeting.sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      bodyMd: s.bodyMd,
      position: s.position,
    })),
    decisions: meeting.decisions.map((d) => ({
      id: d.id,
      body: d.body,
    })),
    actionItems: meeting.actionItems.map((a) => ({
      id: a.id,
      title: a.title,
      assignee: a.assignee
        ? {
            id: a.assignee.id,
            name: a.assignee.name,
            color: a.assignee.color,
            initials: a.assignee.initials,
          }
        : null,
      dueDate: a.dueDate?.toISOString() ?? null,
      status: a.status,
      source: a.source,
    })),
    attendees: meeting.attendees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      color: a.user.color,
      initials: a.user.initials,
      role: a.user.role,
      absent: a.absent,
    })),
  };

  return (
    <>
      <TopBar title={meeting.title} />
      <div className="mt-6">
        <MeetingDetail meeting={detailProps} />
      </div>
    </>
  );
}
