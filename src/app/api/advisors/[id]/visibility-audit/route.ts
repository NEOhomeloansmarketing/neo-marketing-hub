import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { runVisibilityAudit } from "@/lib/visibility-audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: advisorId } = await params;

  const advisor = await db.advisor.findUnique({
    where: { id: advisorId },
    include: { channels: true },
  });

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // Create audit record with RUNNING status
  const audit = await db.visibilityAudit.create({
    data: { advisorId, status: "RUNNING" },
  });

  try {
    const result = await runVisibilityAudit({
      name: advisor.name,
      nmlsNumber: advisor.nmlsNumber,
      email: advisor.email,
      phone: advisor.phone,
      streetAddress: advisor.streetAddress,
      city: advisor.city,
      state: advisor.state,
      zip: advisor.zip,
      title: advisor.title,
      category: advisor.category,
      serviceArea: advisor.serviceArea,
      channels: advisor.channels.map((c) => ({
        platform: c.platform,
        url: c.url,
        label: c.label,
      })),
    });

    // Save completed audit
    const completed = await db.visibilityAudit.update({
      where: { id: audit.id },
      data: {
        status: "COMPLETE",
        score: result.score,
        scoreBreakdown: result.scoreBreakdown as object,
        actionItems: result.actionItems as object,
        conflicts: result.conflicts as object,
        socials: result.socials as object,
        queryVisibility: result.queryVisibility as object,
        completedAt: new Date(),
      },
    });

    // Find Colin Jenson to assign tasks
    const colin = await db.user.findFirst({
      where: { name: { contains: "Colin Jenson", mode: "insensitive" } },
    });

    // Create tasks for each action item
    for (const item of result.actionItems) {
      const title = `[${item.platform}] — ${item.action}`.slice(0, 120);
      const priority =
        item.priority <= 3 ? "HIGH" : item.priority <= 7 ? "MEDIUM" : "LOW";

      await db.task.create({
        data: {
          title,
          description: `Visibility audit action item for ${advisor.name} (NMLS ${advisor.nmlsNumber})`,
          priority: priority as "HIGH" | "MEDIUM" | "LOW",
          status: "TODO",
          ownerId: colin?.id ?? user.id,
          source: "MANUAL",
          scope: "TEAM",
        },
      });
    }

    return NextResponse.json(completed);
  } catch (err) {
    await db.visibilityAudit.update({
      where: { id: audit.id },
      data: { status: "FAILED" },
    });
    console.error("Visibility audit error:", err);
    return NextResponse.json(
      { error: "Audit failed", details: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: advisorId } = await params;

  const audits = await db.visibilityAudit.findMany({
    where: { advisorId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json(audits);
}
