import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const allowed = ["title", "description", "requestType", "status", "priority",
      "advisorName", "advisorEmail", "advisorNmls", "assigneeId", "dueDate", "notes"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = key === "dueDate" && body[key] ? new Date(body[key]) : body[key];
      }
    }
    const req = await db.marketingRequest.update({
      where: { id: params.id },
      data,
      include: { assignee: { select: { id: true, name: true, color: true, initials: true } } },
    });
    return NextResponse.json(req);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await db.marketingRequest.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
