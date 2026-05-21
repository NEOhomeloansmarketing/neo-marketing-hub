import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
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

type RgbColor = ReturnType<typeof rgb>;

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  navy:   rgb(11 / 255,  31 / 255,  53 / 255),   // #0b1f35
  gold:   rgb(245 / 255, 158 / 255, 11 / 255),   // #f59e0b
  white:  rgb(1, 1, 1),
  gray:   rgb(100 / 255, 116 / 255, 139 / 255),  // #64748b
  lgray:  rgb(248 / 255, 250 / 252, 252 / 255),  // #f8fafc
  border: rgb(226 / 255, 232 / 255, 240 / 255),  // #e2e8f0
  green:  rgb(22 / 255,  163 / 255, 74 / 255),   // #16a34a
  orange: rgb(217 / 255, 119 / 255, 6 / 255),    // #d97706
  red:    rgb(220 / 255, 38 / 255,  38 / 255),   // #dc2626
  lblue:  rgb(91 / 255,  203 / 255, 245 / 255),  // #5bcbf5
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2; // 532

function scoreColor(score: number): RgbColor {
  if (score >= 80) return C.green;
  if (score >= 60) return C.orange;
  return C.red;
}

// pdf-lib y=0 is bottom-left. Convert "y from top" to pdf-lib's y.
// `size` = the font size, so text baseline sits at top + size.
function pdfY(topY: number, size = 0): number {
  return PAGE_H - topY - size;
}

// Split text into lines that fit maxWidth
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text ?? "").split("\n")) {
    const words = paragraph.split(" ").filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

// Mutable render context
interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;           // cursor — y from top
  regular: PDFFont;
  bold: PDFFont;
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage(PageSizes.Letter);
  ctx.y = MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y + needed > PAGE_H - MARGIN) newPage(ctx);
}

function fillRect(ctx: Ctx, x: number, topY: number, w: number, h: number, color: RgbColor): void {
  ctx.page.drawRectangle({ x, y: pdfY(topY + h), width: w, height: h, color });
}

function hRule(ctx: Ctx): void {
  ctx.page.drawLine({
    start: { x: MARGIN, y: pdfY(ctx.y) },
    end:   { x: PAGE_W - MARGIN, y: pdfY(ctx.y) },
    thickness: 0.5,
    color: C.border,
  });
  ctx.y += 10;
}

function sectionHeader(ctx: Ctx, title: string): void {
  ensureSpace(ctx, 32);
  fillRect(ctx, MARGIN, ctx.y, CONTENT_W, 22, C.gold);
  ctx.page.drawText(title.toUpperCase(), {
    x: MARGIN + 8,
    y: pdfY(ctx.y + 15),
    font: ctx.bold,
    size: 9,
    color: C.navy,
  });
  ctx.y += 30;
}

// Draw text at cursor (ctx.y), advance cursor
function text(
  ctx: Ctx,
  str: string,
  x: number,
  font: PDFFont,
  size: number,
  color: RgbColor,
  maxWidth?: number
): void {
  const lines = maxWidth ? wrapText(str, font, size, maxWidth) : [str];
  for (const line of lines) {
    ensureSpace(ctx, size * 1.5);
    ctx.page.drawText(line, { x, y: pdfY(ctx.y + size), font, size, color });
    ctx.y += Math.round(size * 1.45);
  }
}

export async function generateAuditPdf(
  result: AuditResult,
  advisor: AdvisorInfo,
  auditDate: Date
): Promise<Buffer> {
  const doc      = await PDFDocument.create();
  const regular  = await doc.embedFont(StandardFonts.Helvetica);
  const bold     = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = { doc, page: doc.addPage(PageSizes.Letter), y: MARGIN, regular, bold };

  // ── Null-safe defaults ────────────────────────────────────────────────────
  const scoreBreakdown = result.scoreBreakdown ?? {
    listingsHealth:        { score: 0, max: 30, notes: "No data available." },
    reviews:               { score: 0, max: 20, notes: "No data available." },
    websiteLocalRelevance: { score: 0, max: 20, notes: "No data available." },
    brandConsistency:      { score: 0, max: 15, notes: "No data available." },
    aiSearchReadiness:     { score: 0, max: 15, notes: "No data available." },
  };
  const queryVisibility = result.queryVisibility ?? {
    branded: "", nonBranded: "",
    topicClusters: [], missedOpportunities: [], serviceAreaExpansion: "",
  };
  const actionItems = result.actionItems ?? [];
  const conflicts   = result.conflicts   ?? [];
  const socials     = result.socials     ?? [];
  const score       = result.score       ?? 0;

  // ── Header bar ────────────────────────────────────────────────────────────
  fillRect(ctx, 0, 0, PAGE_W, 70, C.navy);
  ctx.page.drawText("NEO Marketing Hub", {
    x: MARGIN, y: pdfY(26),
    font: bold, size: 16, color: C.white,
  });
  ctx.page.drawText("Powered by NEO", {
    x: MARGIN, y: pdfY(44),
    font: regular, size: 9, color: C.lblue,
  });
  const dateStr = auditDate.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const dateW = regular.widthOfTextAtSize(dateStr, 9);
  ctx.page.drawText(dateStr, {
    x: PAGE_W - MARGIN - dateW, y: pdfY(44),
    font: regular, size: 9, color: C.white,
  });

  ctx.y = 82;

  // ── Score headline ────────────────────────────────────────────────────────
  const sColor = scoreColor(score);
  const sLabel = score >= 80 ? "STRONG" : score >= 60 ? "NEEDS WORK" : "CRITICAL";

  ctx.page.drawText(advisor.name, {
    x: MARGIN, y: pdfY(ctx.y + 18),
    font: bold, size: 18, color: C.navy,
  });
  ctx.y += 26;

  const prefix = "Online Trust Score:  ";
  ctx.page.drawText(prefix, {
    x: MARGIN, y: pdfY(ctx.y + 14),
    font: bold, size: 14, color: C.navy,
  });
  const prefixW = bold.widthOfTextAtSize(prefix, 14);
  ctx.page.drawText(`${score}/100`, {
    x: MARGIN + prefixW, y: pdfY(ctx.y + 14),
    font: bold, size: 14, color: sColor,
  });

  // Badge
  fillRect(ctx, 420, ctx.y - 2, 135, 26, sColor);
  const lblW = bold.widthOfTextAtSize(sLabel, 12);
  ctx.page.drawText(sLabel, {
    x: 420 + (135 - lblW) / 2, y: pdfY(ctx.y + 16),
    font: bold, size: 12, color: C.white,
  });
  ctx.y += 36;
  hRule(ctx);

  // ── Canonical Entity ──────────────────────────────────────────────────────
  ctx.page.drawText("CANONICAL ENTITY", {
    x: MARGIN, y: pdfY(ctx.y + 8),
    font: bold, size: 8, color: C.gray,
  });
  ctx.y += 12;
  fillRect(ctx, MARGIN, ctx.y, CONTENT_W, 2, C.navy);
  ctx.y += 8;

  const nap = result.extractedNap ?? {};
  const napLines = [
    nap.name
      ? `N [name] — ${nap.name}${nap.teamName ? ` | ${nap.teamName}` : ""}`
      : `Name: ${advisor.name}`,
    nap.address ?? null,
    nap.phone ?? advisor.phone ? `P [phone] — ${nap.phone ?? advisor.phone}` : null,
    nap.email ?? advisor.email ? `Email — ${nap.email ?? advisor.email}` : null,
    nap.title ?? advisor.title ? `Title — ${nap.title ?? advisor.title}` : null,
    nap.category ? `Category — ${nap.category}` : null,
    nap.serviceArea ? `Primary Service Area — ${nap.serviceArea}` : null,
    nap.primaryUrl  ? `Primary URL — ${nap.primaryUrl}` : null,
    nap.nmlsNumber ?? advisor.nmlsNumber
      ? `NMLS # — ${nap.nmlsNumber ?? advisor.nmlsNumber}`
      : null,
  ].filter(Boolean) as string[];

  for (const line of napLines) {
    text(ctx, `• ${line}`, MARGIN + 8, regular, 9, C.navy, CONTENT_W - 8);
  }
  ctx.y += 6;
  hRule(ctx);

  // ── Priority Action Plan ──────────────────────────────────────────────────
  sectionHeader(ctx, "Priority Action Plan");

  for (const item of actionItems.slice(0, 12)) {
    ensureSpace(ctx, 32);
    const bColor = item.priority <= 3 ? C.red : item.priority <= 7 ? C.orange : C.green;
    fillRect(ctx, MARGIN, ctx.y, 18, 15, bColor);
    const numStr = String(item.priority);
    ctx.page.drawText(numStr, {
      x: MARGIN + (18 - bold.widthOfTextAtSize(numStr, 8)) / 2,
      y: pdfY(ctx.y + 11),
      font: bold, size: 8, color: C.white,
    });

    const platStr = `[${item.platform}] `;
    ctx.page.drawText(platStr, {
      x: MARGIN + 22, y: pdfY(ctx.y + 11),
      font: bold, size: 9, color: C.navy,
    });
    const pW = bold.widthOfTextAtSize(platStr, 9);

    const actionLines = wrapText(item.action, regular, 9, CONTENT_W - 22 - pW);
    ctx.page.drawText(actionLines[0], {
      x: MARGIN + 22 + pW, y: pdfY(ctx.y + 11),
      font: regular, size: 9, color: C.navy,
    });
    ctx.y += 16;

    for (let i = 1; i < actionLines.length; i++) {
      ensureSpace(ctx, 13);
      ctx.page.drawText(actionLines[i], {
        x: MARGIN + 22, y: pdfY(ctx.y + 10),
        font: regular, size: 9, color: C.navy,
      });
      ctx.y += 13;
    }

    if (item.url) {
      ensureSpace(ctx, 12);
      ctx.page.drawText(item.url.slice(0, 90), {
        x: MARGIN + 22, y: pdfY(ctx.y + 9),
        font: regular, size: 7, color: C.gray,
      });
      ctx.y += 12;
    }
    ctx.y += 3;
  }
  ctx.y += 4;

  // ── Core Identity Conflicts ───────────────────────────────────────────────
  if (conflicts.length > 0) {
    sectionHeader(ctx, "Core Identity Conflicts");
    for (const c of conflicts) {
      text(ctx, `• ${c}`, MARGIN + 8, regular, 9, C.navy, CONTENT_W - 8);
    }
    ctx.y += 4;
  }

  // ── Links / Socials ───────────────────────────────────────────────────────
  if (socials.length > 0) {
    sectionHeader(ctx, "Links / Socials");
    const STATUS: Record<string, RgbColor> = {
      OK: C.green, ISSUE: C.orange, REMOVE: C.red, MISSING: C.gray,
    };
    for (const s of socials) {
      ensureSpace(ctx, 28);
      const bColor = STATUS[s.status] ?? C.gray;
      fillRect(ctx, MARGIN, ctx.y, 50, 13, bColor);
      const sW = bold.widthOfTextAtSize(s.status, 7);
      ctx.page.drawText(s.status, {
        x: MARGIN + (50 - sW) / 2, y: pdfY(ctx.y + 10),
        font: bold, size: 7, color: C.white,
      });

      ctx.page.drawText(s.platform, {
        x: MARGIN + 56, y: pdfY(ctx.y + 11),
        font: bold, size: 9, color: C.navy,
      });
      if (s.notes) {
        const platW = bold.widthOfTextAtSize(s.platform, 9);
        ctx.page.drawText(` — ${s.notes}`.slice(0, 70), {
          x: MARGIN + 56 + platW, y: pdfY(ctx.y + 11),
          font: regular, size: 8, color: C.gray,
        });
      }
      ctx.y += 15;

      if (s.url) {
        ctx.page.drawText(s.url.slice(0, 85), {
          x: MARGIN + 56, y: pdfY(ctx.y + 9),
          font: regular, size: 7, color: C.gray,
        });
        ctx.y += 12;
      }
      ctx.y += 3;
    }
    ctx.y += 4;
  }

  // ── Score Breakdown ───────────────────────────────────────────────────────
  ensureSpace(ctx, 40);
  sectionHeader(ctx, "Visibility Score Breakdown");

  const categories = [
    { label: "Listings Health",         data: scoreBreakdown.listingsHealth },
    { label: "Reviews",                 data: scoreBreakdown.reviews },
    { label: "Website Local Relevance", data: scoreBreakdown.websiteLocalRelevance },
    { label: "Brand Consistency",       data: scoreBreakdown.brandConsistency },
    { label: "AI Search Readiness",     data: scoreBreakdown.aiSearchReadiness },
  ];

  for (const cat of categories) {
    ensureSpace(ctx, 50);
    const pct = (cat.data.score ?? 0) / (cat.data.max ?? 1);
    const catColor = scoreColor(Math.round(pct * 100));
    const barW = Math.round(pct * 200);

    ctx.page.drawText(cat.label, {
      x: MARGIN, y: pdfY(ctx.y + 10),
      font: bold, size: 9, color: C.navy,
    });
    const lW = bold.widthOfTextAtSize(cat.label, 9);
    ctx.page.drawText(`  ${cat.data.score}/${cat.data.max}`, {
      x: MARGIN + lW, y: pdfY(ctx.y + 10),
      font: bold, size: 9, color: catColor,
    });
    ctx.y += 14;

    // Progress bar
    ctx.page.drawRectangle({ x: MARGIN, y: pdfY(ctx.y + 7), width: 200, height: 6, color: C.lgray });
    if (barW > 0) {
      ctx.page.drawRectangle({ x: MARGIN, y: pdfY(ctx.y + 7), width: barW, height: 6, color: catColor });
    }
    ctx.y += 12;

    if (cat.data.notes) {
      text(ctx, cat.data.notes, MARGIN, regular, 8, C.gray, CONTENT_W);
    }
    ctx.y += 8;
  }

  // ── Query Visibility Map ──────────────────────────────────────────────────
  ensureSpace(ctx, 40);
  sectionHeader(ctx, "Query Visibility Map");

  if (queryVisibility.branded) {
    ctx.page.drawText("Branded Search:", {
      x: MARGIN, y: pdfY(ctx.y + 10),
      font: bold, size: 9, color: C.navy,
    });
    ctx.y += 14;
    text(ctx, queryVisibility.branded, MARGIN, regular, 9, C.gray, CONTENT_W);
    ctx.y += 4;
  }

  if (queryVisibility.nonBranded) {
    ensureSpace(ctx, 20);
    ctx.page.drawText("Non-Branded Search:", {
      x: MARGIN, y: pdfY(ctx.y + 10),
      font: bold, size: 9, color: C.navy,
    });
    ctx.y += 14;
    text(ctx, queryVisibility.nonBranded, MARGIN, regular, 9, C.gray, CONTENT_W);
    ctx.y += 4;
  }

  if (queryVisibility.topicClusters?.length) {
    ensureSpace(ctx, 20);
    ctx.page.drawText("Topic Clusters:", {
      x: MARGIN, y: pdfY(ctx.y + 10),
      font: bold, size: 9, color: C.navy,
    });
    ctx.y += 14;
    for (const tc of queryVisibility.topicClusters) {
      text(ctx, `• ${tc}`, MARGIN + 8, regular, 9, C.gray, CONTENT_W - 8);
    }
    ctx.y += 4;
  }

  if (queryVisibility.missedOpportunities?.length) {
    ensureSpace(ctx, 20);
    ctx.page.drawText("Missed Opportunities:", {
      x: MARGIN, y: pdfY(ctx.y + 10),
      font: bold, size: 9, color: C.navy,
    });
    ctx.y += 14;
    for (const mo of queryVisibility.missedOpportunities) {
      text(ctx, `• ${mo}`, MARGIN + 8, regular, 9, C.red, CONTENT_W - 8);
    }
    ctx.y += 4;
  }

  if (queryVisibility.serviceAreaExpansion) {
    ensureSpace(ctx, 20);
    ctx.page.drawText("Service Area Expansion:", {
      x: MARGIN, y: pdfY(ctx.y + 10),
      font: bold, size: 9, color: C.navy,
    });
    ctx.y += 14;
    text(ctx, queryVisibility.serviceAreaExpansion, MARGIN, regular, 9, C.gray, CONTENT_W);
  }

  // ── Footer on last page ───────────────────────────────────────────────────
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 30, color: C.navy });
  const footerTxt = `Generated ${auditDate.toLocaleDateString()} · NEO Marketing Hub · Powered by Claude AI`;
  const fW = regular.widthOfTextAtSize(footerTxt, 8);
  ctx.page.drawText(footerTxt, {
    x: (PAGE_W - fW) / 2, y: 10,
    font: regular, size: 8, color: C.white,
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
