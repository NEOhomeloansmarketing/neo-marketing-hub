import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET() {
  try {
    await requireAuth();
    const actions = await db.actionItem.findMany({
      include: { assignee: true, meeting: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(actions);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { title, assigneeId, dueDate, priority, meetingId } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 400 });

    const action = await db.actionItem.create({
      data: {
        title,
        status: "OPEN",
        priority: priority ?? "MEDIUM",
        assigneeId,
        createdById: dbUser.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        meetingId,
      },
      include: { assignee: true },
    });
    return NextResponse.json(action, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
