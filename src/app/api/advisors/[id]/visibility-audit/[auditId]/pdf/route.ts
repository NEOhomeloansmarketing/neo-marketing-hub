import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { generateAuditPdf } from "@/lib/audit-pdf";
import type { AuditResult } from "@/lib/visibility-audit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: advisorId, auditId } = await params;

  const audit = await db.visibilityAudit.findUnique({
    where: { id: auditId },
  });

  if (!audit || audit.advisorId !== advisorId) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.status !== "COMPLETE") {
    return NextResponse.json({ error: "Audit not complete" }, { status: 400 });
  }

  const advisor = await db.advisor.findUnique({
    where: { id: advisorId },
  });

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // New audits store the complete result in rawResult.
  // Older audits fall back to the individual columns.
  const raw = audit.rawResult as AuditResult | null;

  const result: AuditResult = raw ?? {
    extractedNap:    (audit.extractedNap   ?? {}) as AuditResult["extractedNap"],
    score:           audit.score ?? 0,
    scoreBreakdown:  (audit.scoreBreakdown  ?? null) as AuditResult["scoreBreakdown"],
    actionItems:     (audit.actionItems     ?? [])   as AuditResult["actionItems"],
    conflicts:       (audit.conflicts       ?? [])   as string[],
    socials:         (audit.socials         ?? [])   as AuditResult["socials"],
    queryVisibility: (audit.queryVisibility ?? null) as AuditResult["queryVisibility"],
  };

  const pdfBuffer = await generateAuditPdf(result, advisor, audit.completedAt ?? audit.createdAt);

  const safeName = advisor.name.replace(/[^a-zA-Z0-9-_]/g, "-");

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-visibility-audit.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
