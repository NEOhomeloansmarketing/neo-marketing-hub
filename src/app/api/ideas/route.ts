import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    await requireAuth();
    const ideas = await db.idea.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { author: true, votes: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ideas);
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
    const { title, body: ideaBody, tags } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    let dbUser = null;
    if (user?.email) {
      dbUser = await db.user.findUnique({ where: { email: user.email } });
    }
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 400 });

    const idea = await db.idea.create({
      data: {
        title,
        body: ideaBody,
        tags: tags ?? [],
        status: "PARKED",
        authorId: dbUser.id,
        votes: { create: { userId: dbUser.id } },
      },
      include: { author: true, votes: true },
    });

    const result = {
      id: idea.id,
      title: idea.title,
      body: idea.body,
      authorId: idea.authorId,
      authorName: idea.author.name,
      authorColor: idea.author.color,
      authorInitials: idea.author.initials,
      tags: idea.tags,
      status: idea.status,
      votes: idea.votes.length,
      votedByCurrentUser: true,
      commentCount: 0,
      createdAt: idea.createdAt.toISOString(),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
