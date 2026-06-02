import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const headlines = await db.headline.findMany({
      where: { resolved: false },
      include: {
        owner: { select: { id: true, name: true, initials: true, color: true } },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(headlines);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, type = "WIN", ownerId } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const headline = await db.headline.create({
      data: {
        title: title.trim(),
        type,
        ownerId: ownerId || null,
      },
      include: {
        owner: { select: { id: true, name: true, initials: true, color: true } },
        task: { select: { id: true, title: true, status: true } },
      },
    });
    return NextResponse.json(headline);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
