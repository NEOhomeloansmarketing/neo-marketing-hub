import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    await requireAuth();
    const tools = await db.tool.findMany({
      include: { owner: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tools);
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
    const { name, url, category, credKind, seats, notes, vaultLink, ownerId } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    let resolvedOwnerId = ownerId;
    if (!resolvedOwnerId && user?.email) {
      const dbUser = await db.user.findUnique({ where: { email: user.email } });
      resolvedOwnerId = dbUser?.id;
    }

    const tool = await db.tool.create({
      data: {
        name,
        url,
        category,
        credKind: credKind ?? "SHARED",
        seats,
        notes,
        vaultLink,
        ownerId: resolvedOwnerId,
      },
      include: { owner: true },
    });
    return NextResponse.json(tool, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
