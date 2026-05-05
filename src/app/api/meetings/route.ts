import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    await requireAuth();
    const meetings = await db.meeting.findMany({
      include: { attendees: { include: { user: true } }, actionItems: true },
      orderBy: { scheduledAt: "desc" },
    });
    return NextResponse.json(meetings);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { title, scheduledAt, durationMinutes, recurrence, attendeeIds, sections } = body;

    if (!title || !scheduledAt) {
      return NextResponse.json({ error: "title and scheduledAt are required" }, { status: 400 });
    }

    let dbUser = null;
    if (user?.email) {
      dbUser = await db.user.findUnique({ where: { email: user.email } });
    }
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 400 });

    const meeting = await db.meeting.create({
      data: {
        title,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes ?? 60,
        recurrence: recurrence ?? "ONE_OFF",
        status: "UPCOMING",
        createdById: dbUser.id,
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
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
