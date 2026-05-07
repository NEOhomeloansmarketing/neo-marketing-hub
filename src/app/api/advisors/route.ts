import { NextResponse } from "next/server";
import { db, AdvisorPlatform } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getActiveTeamId } from "@/lib/team-context";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const activeTeamId = await getActiveTeamId();
  try {
    const advisors = await db.advisor.findMany({
      where: activeTeamId ? { OR: [{ teamId: activeTeamId }, { teamId: null }] } : undefined,
      include: { channels: true, issues: { where: { status: "OPEN" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(advisors);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { name, nmlsNumber, brand, leader, city, state, color, initials, website, linkedinUrl, facebookUrl, instagramUrl, gmbUrl, youtubeUrl, tiktokUrl, zillowUrl, yelpUrl, auditFormUrl, matrixUrl, canvaUrl, socialToolUrl } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const computedInitials = initials ?? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    const channels: { platform: AdvisorPlatform; url: string }[] = [];
    if (website) channels.push({ platform: AdvisorPlatform.WEBSITE, url: website });
    if (linkedinUrl) channels.push({ platform: AdvisorPlatform.LINKEDIN, url: linkedinUrl });
    if (facebookUrl) channels.push({ platform: AdvisorPlatform.FACEBOOK, url: facebookUrl });
    if (instagramUrl) channels.push({ platform: AdvisorPlatform.INSTAGRAM, url: instagramUrl });
    if (gmbUrl) channels.push({ platform: AdvisorPlatform.GOOGLE_BUSINESS, url: gmbUrl });
    if (youtubeUrl) channels.push({ platform: AdvisorPlatform.YOUTUBE, url: youtubeUrl });
    if (tiktokUrl) channels.push({ platform: AdvisorPlatform.TIKTOK, url: tiktokUrl });
    if (zillowUrl) channels.push({ platform: AdvisorPlatform.ZILLOW, url: zillowUrl });
    if (yelpUrl) channels.push({ platform: AdvisorPlatform.YELP, url: yelpUrl });

    const teamId = await getActiveTeamId();

    const advisor = await db.advisor.create({
      data: {
        name,
        nmlsNumber: nmlsNumber ?? "",
        brand,
        leader,
        city,
        state,
        color: color ?? "#5bcbf5",
        initials: computedInitials,
        status: "ACTIVE",
        auditFormUrl: auditFormUrl || null,
        matrixUrl: matrixUrl || null,
        canvaUrl: canvaUrl || null,
        socialToolUrl: socialToolUrl || null,
        teamId: teamId ?? null,
        channels: channels.length > 0 ? { create: channels } : undefined,
      },
      include: { channels: true },
    });
    return NextResponse.json(advisor, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
