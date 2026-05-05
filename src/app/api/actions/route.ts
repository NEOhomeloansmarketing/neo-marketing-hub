import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAuth();
    const actions = await db.actionItem.findMany({
      include: { assignee: true, meeting: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(actions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const { title, assigneeId, dueDate, priority, meetingId } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const action = await db.actionItem.create({
      data: {
        title,
        status: "OPEN",
        priority: priority ?? "MEDIUM",
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        meetingId,
      },
      include: { assignee: true },
    });
    return NextResponse.json(action, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
