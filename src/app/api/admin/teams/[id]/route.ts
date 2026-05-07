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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!(await requireAdmin(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { name, description, color } = body;
    const team = await db.team.update({
      where: { id: params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(color && { color }) },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, color: true, initials: true, role: true, isAdmin: true } } } },
      },
    });
    return NextResponse.json(team);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!(await requireAdmin(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await db.team.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
