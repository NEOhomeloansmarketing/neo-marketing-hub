import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const allowed = ["title", "body", "tags", "status"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) { if (key in body) data[key] = body[key]; }
    const idea = await db.idea.update({ where: { id: params.id }, data });
    return NextResponse.json(idea);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.idea.update({ where: { id: params.id }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
