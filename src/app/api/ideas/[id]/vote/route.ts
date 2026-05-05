import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let dbUser = null;
    if (user?.email) {
      dbUser = await db.user.findUnique({ where: { email: user.email } });
    }
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 400 });

    const existing = await db.ideaVote.findUnique({
      where: { ideaId_userId: { ideaId: params.id, userId: dbUser.id } },
    });

    if (existing) {
      await db.ideaVote.delete({
        where: { ideaId_userId: { ideaId: params.id, userId: dbUser.id } },
      });
      return NextResponse.json({ voted: false });
    } else {
      await db.ideaVote.create({
        data: { ideaId: params.id, userId: dbUser.id },
      });
      return NextResponse.json({ voted: true });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
