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

export async function GET() {
  const user = await getApiUser();
  const admin = await requireAdmin(user);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const teams = await db.team.findMany({
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, color: true, initials: true, role: true, isAdmin: true } } } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(teams);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  const admin = await requireAdmin(user);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { name, description, color } = body;
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);

    const team = await db.team.create({
      data: {
        name,
        slug,
        description: description ?? null,
        color: color ?? "#5bcbf5",
        members: { create: { userId: admin.id, role: "OWNER" } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, color: true, initials: true, role: true, isAdmin: true } } } },
      },
    });
    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
