import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Convert action item to task
    if (body.convertToTask) {
      const dbUser = await getOrCreateDbUser(user);
      if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

      const existing = await db.actionItem.findUnique({ where: { id: params.id } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const task = await db.task.create({
        data: {
          title: existing.title,
          ownerId: existing.assigneeId ?? dbUser.id,
          source: "MEETING",
          sourceId: existing.meetingId ?? undefined,
          priority: existing.priority,
          status: "TODO",
          scope: "TEAM",
          dueDate: existing.dueDate ?? null,
          dueBucket: existing.dueDate ? "this-week" : "later",
        },
      });

      const updated = await db.actionItem.update({
        where: { id: params.id },
        data: { taskId: task.id },
        include: { assignee: true },
      });
      return NextResponse.json(updated);
    }

    const allowed = ["status", "priority", "assigneeId", "dueDate", "title"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = key === "dueDate" && body[key] ? new Date(body[key]) : body[key];
      }
    }
    const action = await db.actionItem.update({
      where: { id: params.id },
      data,
      include: { assignee: true },
    });
    return NextResponse.json(action);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.actionItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
