import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET(req: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // Default to unread only; pass ?all=true to get everything
  const showAll = searchParams.get("all") === "true";

  try {
    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json([], { status: 200 });

    const notifications = await db.notification.findMany({
      where: {
        userId: dbUser.id,
        ...(showAll ? {} : { read: false }),
      },
      include: {
        actor: { select: { id: true, name: true, color: true, initials: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ ok: true });

    await db.notification.updateMany({
      where: { userId: dbUser.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
