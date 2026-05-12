import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { title, description, status, level, ownerId, dueDate, notes, quarter, year } = body;

    const rock = await db.rock.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(level !== undefined && { level }),
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
        ...(quarter !== undefined && { quarter: parseInt(quarter) }),
        ...(year !== undefined && { year: parseInt(year) }),
      },
      include: {
        owner: { select: { id: true, name: true, initials: true, color: true } },
        milestones: { orderBy: { position: "asc" } },
        rockTasks: { include: { task: { select: { id: true, title: true, status: true, priority: true, dueDate: true } } } },
      },
    });

    return NextResponse.json({ rock });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    await db.rock.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
