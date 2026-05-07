import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

async function requireAdmin(user: Awaited<ReturnType<typeof getApiUser>>) {
  if (!user) return null;
  const dbUser = await getOrCreateDbUser(user);
  if (!dbUser?.isAdmin) return null;
  return dbUser;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!(await requireAdmin(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { userId, role } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const member = await db.teamMember.upsert({
      where: { teamId_userId: { teamId: params.id, userId } },
      update: { role: role ?? "MEMBER" },
      create: { teamId: params.id, userId, role: role ?? "MEMBER" },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!(await requireAdmin(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { userId } = await request.json();
    await db.teamMember.delete({
      where: { teamId_userId: { teamId: params.id, userId } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
