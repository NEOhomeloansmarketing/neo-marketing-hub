import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

// Parse @Name mentions from comment body and return matched user ids
async function resolveMentions(body: string): Promise<string[]> {
  const matches = body.match(/@([\w][\w\s'-]*)/g);
  if (!matches || matches.length === 0) return [];

  const names = matches.map((m) => m.slice(1).trim());
  const users = await Promise.all(
    names.map((name) =>
      db.user.findFirst({
        where: { name: { contains: name, mode: "insensitive" }, isActive: true },
        select: { id: true },
      })
    )
  );
  return [...new Set(users.filter(Boolean).map((u) => u!.id))];
}

function entityLink(body: {
  taskId?: string | null;
  campaignId?: string | null;
  meetingId?: string | null;
  rockId?: string | null;
  requestId?: string | null;
}): string {
  if (body.meetingId) return `/meetings/${body.meetingId}`;
  if (body.requestId) return `/requests/${body.requestId}`;
  if (body.taskId) return `/tasks`;
  if (body.rockId) return `/rocks`;
  if (body.campaignId) return `/campaigns`;
  return "/";
}

export async function GET(req: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const campaignId = searchParams.get("campaignId");
  const meetingId = searchParams.get("meetingId");
  const rockId = searchParams.get("rockId");
  const requestId = searchParams.get("requestId");

  try {
    const comments = await db.comment.findMany({
      where: {
        ...(taskId ? { taskId } : {}),
        ...(campaignId ? { campaignId } : {}),
        ...(meetingId ? { meetingId } : {}),
        ...(rockId ? { rockId } : {}),
        ...(requestId ? { requestId } : {}),
      },
      include: {
        author: { select: { id: true, name: true, color: true, initials: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

    const body = await req.json();
    const { body: text, taskId, campaignId, meetingId, rockId, requestId } = body;

    if (!text?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
    if (!taskId && !campaignId && !meetingId && !rockId && !requestId) {
      return NextResponse.json({ error: "At least one entity id is required" }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: {
        body: text.trim(),
        authorId: dbUser.id,
        taskId: taskId ?? null,
        campaignId: campaignId ?? null,
        meetingId: meetingId ?? null,
        rockId: rockId ?? null,
        requestId: requestId ?? null,
      },
      include: {
        author: { select: { id: true, name: true, color: true, initials: true } },
      },
    });

    // Resolve @mentions and create notifications
    const mentionedIds = await resolveMentions(text);
    const link = entityLink({ taskId, campaignId, meetingId, rockId, requestId });

    // Entity label for notification message
    let entityLabel = "a comment";
    if (taskId) entityLabel = "a task";
    else if (meetingId) entityLabel = "a meeting";
    else if (rockId) entityLabel = "a Rock";
    else if (requestId) entityLabel = "a marketing request";
    else if (campaignId) entityLabel = "a campaign";

    await Promise.all(
      mentionedIds
        .filter((id) => id !== dbUser.id) // don't notify yourself
        .map((userId) =>
          db.notification.create({
            data: {
              userId,
              actorId: dbUser.id,
              type: "MENTION",
              message: `${dbUser.name} mentioned you in ${entityLabel}`,
              link,
              commentId: comment.id,
            },
          })
        )
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
