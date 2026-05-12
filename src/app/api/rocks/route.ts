import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { getActiveTeamId } from "@/lib/team-context";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const quarter = searchParams.get("quarter") ? parseInt(searchParams.get("quarter")!) : null;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;

    const where: Record<string, unknown> = {};
    if (quarter) where.quarter = quarter;
    if (year) where.year = year;

    const rocks = await db.rock.findMany({
      where,
      orderBy: [{ level: "asc" }, { createdAt: "asc" }],
      include: {
        owner: { select: { id: true, name: true, initials: true, color: true } },
        milestones: { orderBy: { position: "asc" } },
        rockTasks: {
          include: {
            task: { select: { id: true, title: true, status: true, priority: true, dueDate: true } },
          },
        },
      },
    });

    return NextResponse.json({ rocks });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const activeTeamId = await getActiveTeamId();
    const body = await request.json();

    const { title, description, quarter, year, status, level, ownerId, dueDate, notes } = body;

    if (!title || !quarter || !year) {
      return NextResponse.json({ error: "title, quarter, and year are required" }, { status: 400 });
    }

    const rock = await db.rock.create({
      data: {
        title,
        description: description || null,
        quarter: parseInt(quarter),
        year: parseInt(year),
        status: status || "NOT_STARTED",
        level: level || "COMPANY",
        ownerId: ownerId || null,
        teamId: activeTeamId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
      include: {
        owner: { select: { id: true, name: true, initials: true, color: true } },
        milestones: true,
        rockTasks: { include: { task: { select: { id: true, title: true, status: true, priority: true, dueDate: true } } } },
      },
    });

    return NextResponse.json({ rock });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
