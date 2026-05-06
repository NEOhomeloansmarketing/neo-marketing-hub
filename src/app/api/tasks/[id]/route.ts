import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const allowed = ["status", "priority", "title", "description", "ownerId", "projectId", "dueBucket", "dueDate", "scope"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = key === "dueDate" && body[key] ? new Date(body[key]) : body[key];
      }
    }
    const task = await db.task.update({
      where: { id: params.id },
      data,
      include: { owner: true, followers: { include: { user: true } } },
    });
    return NextResponse.json(task);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.task.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
