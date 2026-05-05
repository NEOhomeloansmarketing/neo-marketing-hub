import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();

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
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.actionItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
