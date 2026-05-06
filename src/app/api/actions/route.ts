import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const actions = await db.actionItem.findMany({
      include: { assignee: true, meeting: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(actions);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, assigneeId, dueDate, priority, meetingId } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

    const action = await db.actionItem.create({
      data: {
        title,
        status: "OPEN",
        priority: priority ?? "MEDIUM",
        assigneeId,
        createdById: dbUser.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        meetingId,
      },
      include: { assignee: true },
    });
    return NextResponse.json(action, { status: 201 });
  } catch (e) {
    console.error("POST /api/actions error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
