import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { getActiveTeamId } from "@/lib/team-context";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tasks = await db.task.findMany({
      include: { owner: true, followers: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, description, ownerId, projectId, dueBucket, dueDate, priority, scope, teamId: bodyTeamId } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    let resolvedOwnerId = ownerId;
    if (!resolvedOwnerId) {
      const dbUser = await getOrCreateDbUser(user);
      resolvedOwnerId = dbUser?.id;
    }

    if (!resolvedOwnerId) {
      return NextResponse.json({ error: "Could not resolve owner — user not found in DB" }, { status: 400 });
    }

    const activeTeamId = bodyTeamId ?? (await getActiveTeamId());

    const task = await db.task.create({
      data: {
        title,
        description,
        ownerId: resolvedOwnerId,
        teamId: activeTeamId ?? null,
        projectId,
        dueBucket: dueBucket ?? "later",
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ?? "MEDIUM",
        status: "TODO",
        scope: scope ?? "TEAM",
      },
      include: { owner: true, followers: { include: { user: true } } },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    console.error("POST /api/tasks error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
