import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { runVisibilityAudit } from "@/lib/visibility-audit";

// Allow up to 5 minutes — Claude + processing can take 30-90 seconds
export const maxDuration = 300;

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

  // Pre-flight check
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in environment variables. Add it in Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
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
      napFormUrl: advisor.napFormUrl,
      channels: advisor.channels.map((c) => ({
        platform: c.platform,
        url: c.url,
        label: c.label,
      })),
    });

    // Save completed audit — rawResult stores the full object for PDF generation
    const completed = await db.visibilityAudit.update({
      where: { id: audit.id },
      data: {
        status: "COMPLETE",
        score: result.score,
        extractedNap: result.extractedNap as object,
        scoreBreakdown: result.scoreBreakdown as object,
        actionItems: result.actionItems as object,
        conflicts: result.conflicts as object,
        socials: result.socials as object,
        queryVisibility: result.queryVisibility as object,
        rawResult: result as object,
        completedAt: new Date(),
      },
    });

    // Find Colin Jenson to assign the single website-updates task
    const colin = await db.user.findFirst({
      where: { name: { contains: "Colin Jenson", mode: "insensitive" } },
    });

    // Create ONE consolidated task covering all website / online visibility updates
    if (result.actionItems.length > 0) {
      const auditDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const actionLines = result.actionItems
        .map((item) => {
          const urlPart = item.url ? `\n   ${item.url}` : "";
          return `${item.priority}. [${item.platform}] ${item.action}${urlPart}`;
        })
        .join("\n\n");

      const websiteChannel = advisor.channels.find((c) => c.platform === "WEBSITE");
      const websiteNote = websiteChannel ? `Website: ${websiteChannel.url}` : "Website: not on file";

      await db.task.create({
        data: {
          title: `${advisor.name} — Website & Online Visibility Updates`,
          description: [
            `Visibility audit completed for ${advisor.name} (NMLS ${advisor.nmlsNumber}) on ${auditDate}.`,
            `Score: ${result.score}/100`,
            websiteNote,
            ``,
            `Action Items:`,
            actionLines,
          ].join("\n"),
          priority: "HIGH",
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
