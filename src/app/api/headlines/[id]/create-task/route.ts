import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { assigneeId, priority = "MEDIUM", dueDate } = body;

  const headline = await db.headline.findUnique({ where: { id } });
  if (!headline) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (headline.taskId) return NextResponse.json({ error: "Task already exists" }, { status: 400 });

  const ownerId = assigneeId || headline.ownerId || user.id;

  const task = await db.task.create({
    data: {
      title: headline.title,
      description: `Created from headline (${headline.type})`,
      ownerId,
      priority,
      status: "TODO",
      source: "MANUAL",
      scope: "TEAM",
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
    },
  });

  const updated = await db.headline.update({
    where: { id },
    data: { taskId: task.id },
    include: {
      owner: { select: { id: true, name: true, initials: true, color: true } },
      task: { select: { id: true, title: true, status: true } },
    },
  });

  return NextResponse.json(updated);
}
