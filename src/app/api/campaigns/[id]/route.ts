import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const allowed = [
      "title", "description", "dudaTemplate", "emailBlasts", "smsBlasts",
      "canvaLink1", "canvaLink2", "canvaLink3", "videoScript", "launched",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }
    if ("launched" in body) {
      data.launchedAt = body.launched ? new Date() : null;
    }
    const updated = await db.campaign.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.campaign.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
