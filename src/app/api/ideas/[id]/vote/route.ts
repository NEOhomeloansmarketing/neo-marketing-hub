import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

    const existing = await db.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId: params.id, userId: dbUser.id } },
    });

    if (existing) {
      await db.ideaVote.delete({ where: { ideaId_userId: { ideaId: params.id, userId: dbUser.id } } });
      return NextResponse.json({ voted: false });
    } else {
      await db.ideaVote.create({ data: { ideaId: params.id, userId: dbUser.id } });
      return NextResponse.json({ voted: true });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
