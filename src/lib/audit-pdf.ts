import PDFDocument from "pdfkit";
import type { AuditResult } from "./visibility-audit";

interface AdvisorInfo {
  name: string;
  nmlsNumber: string;
  email?: string | null;
  phone?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  title?: string | null;
  category?: string | null;
  serviceArea?: string | null;
}

const NAVY = "#0b1f35";
const GOLD_BG = "#f59e0b";
const LIGHT_GRAY = "#f8fafc";
const GRAY_TEXT = "#64748b";
const BORDER = "#e2e8f0";
const WHITE = "#ffffff";

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a"; // green
  if (score >= 60) return "#d97706"; // orange
  return "#dc2626"; // red
}

function scoreLabel(score: number): string {
  if (score >= 80) return "STRONG";
  if (score >= 60) return "NEEDS WORK";
  return "CRITICAL";
}

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number
): number {
  // Gold/amber background bar
  doc.rect(40, y, 515, 22).fill(GOLD_BG);
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(title.toUpperCase(), 48, y + 7, { width: 500 });
  return y + 30;
}

function drawLine(doc: PDFKit.PDFDocument, y: number): void {
  doc.moveTo(40, y).lineTo(555, y).strokeColor(BORDER).lineWidth(0.5).stroke();
}

export async function generateAuditPdf(
  result: AuditResult,
  advisor: AdvisorInfo,
  auditDate: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, 612, 70).fill(NAVY);
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("NEO Marketing Hub", 40, 18);
    doc
      .fillColor("#5bcbf5")
      .font("Helvetica")
      .fontSize(9)
      .text("Powered by NEO", 40, 38);
    doc
      .fillColor(WHITE)
      .font("Helvetica")
      .fontSize(9)
      .text(`Generated: ${auditDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 350, 28, {
        width: 200,
        align: "right",
      });

    let y = 85;

    // ── Score headline ───────────────────────────────────────────────────────
    const color = scoreColor(result.score);
    const label = scoreLabel(result.score);

    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(`${advisor.name}`, 40, y);
    y += 22;

    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("Online Trust Score: ", 40, y, { continued: true });
    doc.fillColor(color).font("Helvetica-Bold").fontSize(14).text(`${result.score}/100`);

    // Score badge
    doc.rect(420, y - 4, 135, 28).fill(color);
    doc
      .fillColor(WHITE)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(label, 420, y + 4, { width: 135, align: "center" });

    y += 38;
    drawLine(doc, y);
    y += 12;

    // ── Canonical Entity Block (from extracted NAP form) ────────────────────
    doc.fillColor(GRAY_TEXT).font("Helvetica-Bold").fontSize(8).text("CANONICAL ENTITY", 40, y);
    y += 12;
    doc.rect(40, y, 515, 2).fill(NAVY);
    y += 8;

    const nap = result.extractedNap ?? {};
    const napLines = [
      nap.name ? `N [name] — ${nap.name}${nap.teamName ? ` | ${nap.teamName}` : ""}` : `Name: ${advisor.name}`,
      nap.address ? `A [address] — ${nap.address}` : null,
      nap.phone ? `P [phone] — ${nap.phone}` : advisor.phone ? `P [phone] — ${advisor.phone}` : null,
      nap.email ? `Email — ${nap.email}` : advisor.email ? `Email — ${advisor.email}` : null,
      nap.title ? `Title — ${nap.title}` : advisor.title ? `Title — ${advisor.title}` : null,
      nap.category ? `Category — ${nap.category}` : null,
      nap.serviceArea ? `Primary Service Area — ${nap.serviceArea}` : null,
      nap.primaryUrl ? `Primary URL — ${nap.primaryUrl}` : null,
      (nap.nmlsNumber ?? advisor.nmlsNumber) ? `NMLS # — ${nap.nmlsNumber ?? advisor.nmlsNumber}` : null,
    ].filter(Boolean) as string[];

    for (const line of napLines) {
      doc.fillColor(NAVY).font("Helvetica").fontSize(9).text(`• ${line}`, 48, y, { width: 490 });
      y += 14;
    }
    y += 6;
    drawLine(doc, y);
    y += 12;

    // ── Priority Action Plan ─────────────────────────────────────────────────
    y = drawSectionHeader(doc, "Priority Action Plan", y);

    const items = result.actionItems.slice(0, 10);
    for (const item of items) {
      const priorityColor = item.priority <= 3 ? "#dc2626" : item.priority <= 7 ? "#d97706" : "#16a34a";
      doc.rect(40, y, 18, 14).fill(priorityColor);
      doc
        .fillColor(WHITE)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(String(item.priority), 40, y + 3, { width: 18, align: "center" });

      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`[${item.platform}]`, 64, y + 1, { continued: true });
      doc
        .fillColor(NAVY)
        .font("Helvetica")
        .fontSize(9)
        .text(` ${item.action}`, { width: 450 });

      if (item.url) {
        doc
          .fillColor(GRAY_TEXT)
          .font("Helvetica")
          .fontSize(7)
          .text(`  ${item.url}`, 64, doc.y);
      }
      y = doc.y + 5;

      if (y > 700) {
        doc.addPage();
        y = 40;
      }
    }
    y += 4;

    // ── Core Identity Conflicts ──────────────────────────────────────────────
    if (result.conflicts && result.conflicts.length > 0) {
      if (y > 650) { doc.addPage(); y = 40; }
      y = drawSectionHeader(doc, "Core Identity Conflicts", y);
      for (const conflict of result.conflicts) {
        doc
          .fillColor(NAVY)
          .font("Helvetica")
          .fontSize(9)
          .text(`• ${conflict}`, 48, y, { width: 490 });
        y = doc.y + 5;
        if (y > 700) { doc.addPage(); y = 40; }
      }
      y += 4;
    }

    // ── Links / Socials ──────────────────────────────────────────────────────
    if (result.socials && result.socials.length > 0) {
      if (y > 600) { doc.addPage(); y = 40; }
      y = drawSectionHeader(doc, "Links / Socials", y);

      const statusColors: Record<string, string> = {
        OK: "#16a34a",
        ISSUE: "#d97706",
        REMOVE: "#dc2626",
        MISSING: "#64748b",
      };

      for (const social of result.socials) {
        const badgeColor = statusColors[social.status] ?? GRAY_TEXT;
        doc.rect(40, y, 50, 13).fill(badgeColor);
        doc
          .fillColor(WHITE)
          .font("Helvetica-Bold")
          .fontSize(7)
          .text(social.status, 40, y + 3, { width: 50, align: "center" });

        doc
          .fillColor(NAVY)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(`${social.platform}`, 98, y + 1, { continued: true });

        if (social.notes) {
          doc
            .fillColor(GRAY_TEXT)
            .font("Helvetica")
            .fontSize(8)
            .text(` — ${social.notes}`, { width: 400 });
        } else {
          doc.text("", { width: 400 });
        }

        doc
          .fillColor(GRAY_TEXT)
          .font("Helvetica")
          .fontSize(7)
          .text(`  ${social.url}`, 98, doc.y, { width: 450 });

        y = doc.y + 6;
        if (y > 700) { doc.addPage(); y = 40; }
      }
      y += 4;
    }

    // ── Visibility Score Breakdown ───────────────────────────────────────────
    if (y > 580) { doc.addPage(); y = 40; }
    y = drawSectionHeader(doc, "Visibility Score Breakdown", y);

    const categories = [
      { label: "Listings Health", data: result.scoreBreakdown.listingsHealth },
      { label: "Reviews", data: result.scoreBreakdown.reviews },
      { label: "Website Local Relevance", data: result.scoreBreakdown.websiteLocalRelevance },
      { label: "Brand Consistency", data: result.scoreBreakdown.brandConsistency },
      { label: "AI Search Readiness", data: result.scoreBreakdown.aiSearchReadiness },
    ];

    for (const cat of categories) {
      const pct = cat.data.score / cat.data.max;
      const barWidth = Math.round(pct * 200);
      const catColor = scoreColor(Math.round(pct * 100));

      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`${cat.label}`, 40, y, { continued: true });
      doc
        .fillColor(catColor)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`  ${cat.data.score}/${cat.data.max}`);

      // Progress bar background
      doc.rect(40, y + 12, 200, 6).fill(LIGHT_GRAY).stroke(BORDER);
      if (barWidth > 0) {
        doc.rect(40, y + 12, barWidth, 6).fill(catColor);
      }

      doc
        .fillColor(GRAY_TEXT)
        .font("Helvetica")
        .fontSize(8)
        .text(cat.data.notes, 40, y + 22, { width: 515 });

      y = doc.y + 10;
      if (y > 700) { doc.addPage(); y = 40; }
    }
    y += 4;

    // ── Query Visibility Map ─────────────────────────────────────────────────
    if (y > 580) { doc.addPage(); y = 40; }
    y = drawSectionHeader(doc, "Query Visibility Map", y);

    const qv = result.queryVisibility;

    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Branded Search:", 40, y);
    doc
      .fillColor(GRAY_TEXT)
      .font("Helvetica")
      .fontSize(9)
      .text(qv.branded, 40, doc.y + 2, { width: 515 });
    y = doc.y + 8;

    doc
      .fillColor(NAVY)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Non-Branded Search:", 40, y);
    doc
      .fillColor(GRAY_TEXT)
      .font("Helvetica")
      .fontSize(9)
      .text(qv.nonBranded, 40, doc.y + 2, { width: 515 });
    y = doc.y + 8;

    if (qv.topicClusters && qv.topicClusters.length > 0) {
      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Topic Clusters:", 40, y);
      y = doc.y + 3;
      for (const tc of qv.topicClusters) {
        doc
          .fillColor(GRAY_TEXT)
          .font("Helvetica")
          .fontSize(9)
          .text(`• ${tc}`, 48, y, { width: 510 });
        y = doc.y + 2;
      }
      y += 4;
    }

    if (qv.missedOpportunities && qv.missedOpportunities.length > 0) {
      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Missed Opportunities:", 40, y);
      y = doc.y + 3;
      for (const mo of qv.missedOpportunities) {
        doc
          .fillColor("#dc2626")
          .font("Helvetica")
          .fontSize(9)
          .text(`• ${mo}`, 48, y, { width: 510 });
        y = doc.y + 2;
      }
      y += 4;
    }

    if (qv.serviceAreaExpansion) {
      doc
        .fillColor(NAVY)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Service Area Expansion:", 40, y);
      doc
        .fillColor(GRAY_TEXT)
        .font("Helvetica")
        .fontSize(9)
        .text(qv.serviceAreaExpansion, 40, doc.y + 2, { width: 515 });
      y = doc.y + 8;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = 740;
    doc.rect(0, footerY, 612, 30).fill(NAVY);
    doc
      .fillColor(WHITE)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Generated ${auditDate.toLocaleDateString()} · NEO Marketing Hub · Powered by Claude AI`,
        40,
        footerY + 10,
        { width: 530, align: "center" }
      );

    doc.end();
  });
}
