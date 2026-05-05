import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAuth();
    const advisors = await db.advisor.findMany({
      include: { channels: true, issues: { where: { status: "OPEN" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(advisors);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const { name, nmlsNumber, brand, leader, city, state, color, initials } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const advisor = await db.advisor.create({
      data: {
        name,
        nmlsNumber,
        brand,
        leader,
        city,
        state,
        color: color ?? "#5bcbf5",
        initials: initials ?? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        status: "ACTIVE",
      },
      include: { channels: true },
    });
    return NextResponse.json(advisor, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
