import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const headline = await db.headline.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.ownerId !== undefined && { ownerId: body.ownerId || null }),
      ...(body.resolved !== undefined && { resolved: body.resolved }),
      ...(body.taskId !== undefined && { taskId: body.taskId || null }),
    },
    include: {
      owner: { select: { id: true, name: true, initials: true, color: true } },
      task: { select: { id: true, title: true, status: true } },
    },
  });

  return NextResponse.json(headline);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.headline.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
