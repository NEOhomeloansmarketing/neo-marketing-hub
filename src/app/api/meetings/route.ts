import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { getActiveTeamId } from "@/lib/team-context";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const meetings = await db.meeting.findMany({
      include: { attendees: { include: { user: true } }, actionItems: true },
      orderBy: { scheduledAt: "desc" },
    });
    return NextResponse.json(meetings);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, scheduledAt, durationMinutes, recurrence, attendeeIds, sections } = body;

    if (!title || !scheduledAt) {
      return NextResponse.json({ error: "title and scheduledAt are required" }, { status: 400 });
    }

    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

    const activeTeamId = await getActiveTeamId();

    const meeting = await db.meeting.create({
      data: {
        title,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes ?? 60,
        recurrence: recurrence ?? "ONE_OFF",
        status: "UPCOMING",
        createdById: dbUser.id,
        teamId: activeTeamId ?? null,
        attendees: attendeeIds?.length
          ? { create: (attendeeIds as string[]).map((userId: string) => ({ userId })) }
          : undefined,
        sections: sections?.length
          ? {
              create: (sections as (string | { heading: string; bodyMd?: string })[]).map((s, i) => ({
                heading: typeof s === "string" ? s : s.heading,
                bodyMd: typeof s === "string" ? "" : (s.bodyMd ?? ""),
                position: i,
              })),
            }
          : undefined,
      },
      include: {
        attendees: { include: { user: true } },
        sections: true,
        actionItems: true,
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (e) {
    console.error("POST /api/meetings error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
