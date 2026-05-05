import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    await requireAuth();
    const tasks = await db.task.findMany({
      include: { owner: true, followers: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
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
    const { title, description, ownerId, projectId, dueBucket, dueDate, priority, scope } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    let resolvedOwnerId = ownerId;
    if (!resolvedOwnerId && user?.email) {
      const dbUser = await db.user.findUnique({ where: { email: user.email } });
      resolvedOwnerId = dbUser?.id;
    }

    if (!resolvedOwnerId) {
      return NextResponse.json({ error: "ownerId required" }, { status: 400 });
    }

    const task = await db.task.create({
      data: {
        title,
        description,
        ownerId: resolvedOwnerId,
        projectId,
        dueBucket: dueBucket ?? "later",
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ?? "MEDIUM",
        status: "OPEN",
        scope: scope ?? "TEAM",
      },
      include: { owner: true, followers: { include: { user: true } } },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
