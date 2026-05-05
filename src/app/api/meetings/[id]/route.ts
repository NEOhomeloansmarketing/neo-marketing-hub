import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const meeting = await db.meeting.findUnique({
      where: { id: params.id },
      include: {
        attendees: { include: { user: true } },
        sections: { orderBy: { position: "asc" } },
        decisions: true,
        actionItems: { include: { assignee: true } },
      },
    });
    if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(meeting);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const meeting = await db.meeting.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json(meeting);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.meeting.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
