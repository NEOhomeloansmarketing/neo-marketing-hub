import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const requests = await db.marketingRequest.findMany({
      include: { assignee: { select: { id: true, name: true, color: true, initials: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      title, description, requestType, priority, advisorName, advisorEmail,
      advisorNmls, assigneeId, dueDate, notes,
    } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const req = await db.marketingRequest.create({
      data: {
        title,
        description: description ?? null,
        requestType: requestType ?? "OTHER",
        priority: priority ?? "MEDIUM",
        status: "NEW",
        advisorName: advisorName ?? null,
        advisorEmail: advisorEmail ?? null,
        advisorNmls: advisorNmls ?? null,
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
      },
      include: { assignee: { select: { id: true, name: true, color: true, initials: true } } },
    });
    return NextResponse.json(req, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
