import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { getActiveTeamId } from "@/lib/team-context";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeTeamId = await getActiveTeamId();

  try {
    const actions = await db.actionItem.findMany({
      where: activeTeamId ? { teamId: activeTeamId } : undefined,
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
    const { title, assigneeId, dueDate, priority, meetingId, createTask } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

    // If action item has an assignee, auto-create a task for them
    let taskId: string | undefined;
    if (createTask) {
      const ownerId = assigneeId ?? dbUser.id;
      const task = await db.task.create({
        data: {
          title,
          ownerId,
          source: "MEETING",
          sourceId: meetingId,
          priority: priority ?? "MEDIUM",
          status: "TODO",
          scope: "TEAM",
          dueDate: dueDate ? new Date(dueDate) : null,
          dueBucket: dueDate ? "this-week" : "later",
        },
      });
      taskId = task.id;
    }

    const teamId = await getActiveTeamId();

    const action = await db.actionItem.create({
      data: {
        title,
        status: "OPEN",
        priority: priority ?? "MEDIUM",
        assigneeId: assigneeId || undefined,
        createdById: dbUser.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        meetingId,
        source: meetingId ? "MEETING" : "MANUAL",
        taskId,
        teamId: teamId ?? null,
      },
      include: { assignee: true },
    });
    return NextResponse.json(action, { status: 201 });
  } catch (e) {
    console.error("POST /api/actions error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
