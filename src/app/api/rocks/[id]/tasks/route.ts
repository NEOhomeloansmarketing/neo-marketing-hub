import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

// Link a task to a rock
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id: rockId } = await params;
    const { taskId } = await request.json();

    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

    await db.rockTask.upsert({
      where: { rockId_taskId: { rockId, taskId } },
      create: { rockId, taskId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Unlink a task from a rock
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id: rockId } = await params;
    const { taskId } = await request.json();

    await db.rockTask.delete({ where: { rockId_taskId: { rockId, taskId } } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
