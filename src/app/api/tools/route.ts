import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tools = await db.tool.findMany({
      include: { owner: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tools);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, url, category, credKind, seats, notesMd, vaultLink, ownerUserId } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    let resolvedOwnerUserId = ownerUserId;
    if (!resolvedOwnerUserId) {
      const dbUser = await getOrCreateDbUser(user);
      resolvedOwnerUserId = dbUser?.id;
    }

    const tool = await db.tool.create({
      data: { name, url, category, credKind: credKind ?? "SHARED", seats, notesMd, vaultLink, ownerUserId: resolvedOwnerUserId },
      include: { owner: true },
    });
    return NextResponse.json(tool, { status: 201 });
  } catch (e) {
    console.error("POST /api/tools error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
