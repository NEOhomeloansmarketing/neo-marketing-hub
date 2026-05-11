import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getActiveTeamId } from "@/lib/team-context";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = await getActiveTeamId();
  const campaigns = await db.campaign.findMany({
    where: teamId ? { OR: [{ teamId }, { teamId: null }] } : undefined,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = await getActiveTeamId();
  const body = await request.json();

  const campaign = await db.campaign.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      month: Number(body.month),
      year: Number(body.year),
      dudaTemplate: body.dudaTemplate ?? null,
      emailBlasts: body.emailBlasts ?? null,
      smsBlasts: body.smsBlasts ?? null,
      canvaLink1: body.canvaLink1 ?? null,
      canvaLink2: body.canvaLink2 ?? null,
      canvaLink3: body.canvaLink3 ?? null,
      videoScript: body.videoScript ?? null,
      teamId: teamId ?? null,
    },
  });
  return NextResponse.json(campaign);
}
