import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json([]);

    const memberships = await db.teamMember.findMany({
      where: { userId: dbUser.id },
      include: { team: { include: { members: { include: { user: true } } } } },
    });
    return NextResponse.json(memberships.map((m) => m.team));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, description, color } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();

    const team = await db.team.create({
      data: {
        name: name.trim(),
        slug,
        description,
        color: color ?? "#5bcbf5",
        members: { create: { userId: dbUser.id, role: "OWNER" } },
      },
      include: { members: { include: { user: true } } },
    });
    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
