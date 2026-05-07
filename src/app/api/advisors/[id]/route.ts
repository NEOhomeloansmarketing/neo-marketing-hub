import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const advisor = await db.advisor.findUnique({
      where: { id: params.id },
      include: { channels: true, issues: true, audits: { include: { checks: true } } },
    });
    if (!advisor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(advisor);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const advisor = await db.advisor.update({
      where: { id: params.id },
      data: body,
      include: { channels: true },
    });
    return NextResponse.json(advisor);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.advisor.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
