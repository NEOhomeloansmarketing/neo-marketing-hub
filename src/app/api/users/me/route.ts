import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function PATCH(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dbUser = await getOrCreateDbUser(user);
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const body = await request.json();
    const allowed = ["name", "initials", "color", "role"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }
    const updated = await db.user.update({
      where: { id: dbUser.id },
      data,
      select: { id: true, name: true, email: true, initials: true, color: true, role: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
