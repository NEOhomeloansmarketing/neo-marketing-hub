import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ideas = await db.idea.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { author: true, votes: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ideas);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, body: ideaBody, tags } = body;

    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

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

    return NextResponse.json({
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
    }, { status: 201 });
  } catch (e) {
    console.error("POST /api/ideas error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
