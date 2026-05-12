import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id: rockId } = await params;
    const { title, dueDate } = await request.json();

    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    // Get highest position
    const last = await db.milestone.findFirst({ where: { rockId }, orderBy: { position: "desc" } });
    const position = (last?.position ?? -1) + 1;

    const milestone = await db.milestone.create({
      data: { rockId, title, dueDate: dueDate ? new Date(dueDate) : null, position },
    });

    return NextResponse.json({ milestone });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
