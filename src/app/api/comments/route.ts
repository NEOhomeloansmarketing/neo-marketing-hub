import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { sendMentionEmail } from "@/lib/email";

// Parse @Name mentions, return matched users with email
async function resolveMentions(body: string): Promise<{ id: string; name: string; email: string }[]> {
  const matches = body.match(/@([\w][\w\s'-]*)/g);
  if (!matches || matches.length === 0) return [];

  const names = matches.map((m) => m.slice(1).trim());
  const users = await Promise.all(
    names.map((name) =>
      db.user.findFirst({
        where: { name: { contains: name, mode: "insensitive" }, isActive: true },
        select: { id: true, name: true, email: true },
      })
    )
  );

  // Deduplicate by id
  const seen = new Set<string>();
  return users.filter(Boolean).filter((u) => {
    if (seen.has(u!.id)) return false;
    seen.add(u!.id);
    return true;
  }) as { id: string; name: string; email: string }[];
}

function entityLink(body: {
  taskId?: string | null;
  campaignId?: string | null;
  meetingId?: string | null;
  rockId?: string | null;
  requestId?: string | null;
}): string {
  // Meetings have a dedicated page; others use ?open=ID to auto-open the drawer
  if (body.meetingId) return `/meetings/${body.meetingId}`;
  if (body.requestId) return `/requests?open=${body.requestId}`;
  if (body.taskId) return `/tasks?open=${body.taskId}`;
  if (body.rockId) return `/rocks?open=${body.rockId}`;
  if (body.campaignId) return `/campaigns?open=${body.campaignId}`;
  return "/dashboard";
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

    // Resolve @mentions and create notifications + emails
    const mentionedUsers = await resolveMentions(text);
    const link = entityLink({ taskId, campaignId, meetingId, rockId, requestId });

    // Entity label for notification message
    let entityLabel = "a comment";
    if (taskId) entityLabel = "a task";
    else if (meetingId) entityLabel = "a meeting";
    else if (rockId) entityLabel = "a Rock";
    else if (requestId) entityLabel = "a marketing request";
    else if (campaignId) entityLabel = "a campaign";

    await Promise.all(
      mentionedUsers
        .map(async (mentionedUser) => {
          // In-app notification
          await db.notification.create({
            data: {
              userId: mentionedUser.id,
              actorId: dbUser.id,
              type: "MENTION",
              message: `${dbUser.name} mentioned you in ${entityLabel}`,
              link,
              commentId: comment.id,
            },
          });

          // Email notification (fire-and-forget — won't delay the response)
          sendMentionEmail({
            to: mentionedUser.email,
            recipientName: mentionedUser.name,
            actorName: dbUser.name,
            entityLabel,
            commentBody: text.trim(),
            link,
          });
        })
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
