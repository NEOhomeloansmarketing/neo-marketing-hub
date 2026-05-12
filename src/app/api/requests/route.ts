import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { sendNewRequestEmail } from "@/lib/email";

// Always-assign user — looked up by name at runtime so no hardcoded IDs
const DEFAULT_ASSIGNEE_NAME = "Zeph Davis";

async function getDefaultAssignee() {
  return db.user.findFirst({
    where: { name: { contains: DEFAULT_ASSIGNEE_NAME, mode: "insensitive" }, isActive: true },
    select: { id: true, name: true, email: true, color: true, initials: true },
  });
}

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
      advisorNmls, dueDate, notes,
    } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    // Auto-assign to Zeph Davis (override any assigneeId from the form)
    const assignee = await getDefaultAssignee();

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
        assigneeId: assignee?.id ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
      },
      include: { assignee: { select: { id: true, name: true, color: true, initials: true } } },
    });

    // Email Zeph
    if (assignee) {
      sendNewRequestEmail({
        to: assignee.email,
        recipientName: assignee.name,
        requestTitle: title,
        requestType: requestType ?? "Other",
        advisorName: advisorName ?? null,
        description: description ?? null,
        link: `/requests/${req.id}`,
      });
    }

    return NextResponse.json(req, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
