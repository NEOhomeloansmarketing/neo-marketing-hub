import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dbUser = await getOrCreateDbUser(user);
  if (!dbUser?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, color: true, initials: true, role: true, isAdmin: true, isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
