/**
 * audit-pdf.ts
 * Generates the NEO Advisor Visibility Audit PDF using pdf-lib.
 * Layout matches the Cody Hardridge Online Trust Score example format.
 */

import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import type { AuditResult } from "./visibility-audit";

// ── Types ─────────────────────────────────────────────────────────────────────
type Color = ReturnType<typeof rgb>;

export interface AdvisorInfo {
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

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  black:   rgb(0.067, 0.067, 0.067),   // near-black body text #111
  navy:    rgb(0.043, 0.122, 0.208),   // #0b1f35 headings
  gold:    rgb(0.98,  0.80,  0.18),    // #f9cc2e amber section headers
  goldDk:  rgb(0.92,  0.65,  0.02),    // slightly darker gold for text on gold
  teal:    rgb(0.0,   0.502, 0.502),   // #008080 subheadings like "Name To-Do:"
  white:   rgb(1, 1, 1),
  gray:    rgb(0.40,  0.40,  0.40),    // body gray
  lgray:   rgb(0.92,  0.92,  0.92),    // light gray backgrounds
  green:   rgb(0.086, 0.639, 0.290),   // #16a34a score good
  orange:  rgb(0.976, 0.447, 0.024),   // #f97316 score mid
  red:     rgb(0.863, 0.149, 0.149),   // #dc2626 score bad / REMOVE
  amber:   rgb(0.851, 0.467, 0.024),   // #d97706 ISSUE
  muted:   rgb(0.55,  0.55,  0.55),    // URL text / small labels
  remove:  rgb(0.6,   0.1,   0.1),     // REMOVE items
};

// ── Page constants ─────────────────────────────────────────────────────────────
const PW  = 612;   // Letter width  (pts)
const PH  = 792;   // Letter height (pts)
const ML  = 54;    // left margin
const MR  = 558;   // right margin
const CW  = MR - ML;   // 504 — content width
const BOT = 60;    // bottom margin (don't render below PH - BOT)

// ── Render context ─────────────────────────────────────────────────────────────
interface Ctx {
  doc:     PDFDocument;
  page:    PDFPage;
  y:       number;   // cursor — distance from TOP of page
  reg:     PDFFont;
  bold:    PDFFont;
  pageNum: number;
}

// pdf-lib y=0 is bottom-left. Convert "y from top" + size to baseline y.
function py(topY: number, size: number): number {
  return PH - topY - size;
}

function scoreColor(score: number): Color {
  if (score >= 80) return C.green;
  if (score >= 60) return C.orange;
  return C.red;
}

function addPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage(PageSizes.Letter);
  ctx.y = 50;
  ctx.pageNum++;
}

// Ensure at least `needed` pts remain before bottom margin; add page if not.
function need(ctx: Ctx, needed: number): void {
  if (ctx.y + needed > PH - BOT) addPage(ctx);
}

// Fill rectangle (topY-based)
function rect(ctx: Ctx, x: number, topY: number, w: number, h: number, color: Color): void {
  ctx.page.drawRectangle({ x, y: PH - topY - h, width: w, height: h, color });
}

// Draw text at (x, topY) — topY is the TOP of the line.
function dt(
  page: PDFPage,
  text: string,
  x: number,
  topY: number,
  font: PDFFont,
  size: number,
  color: Color
): void {
  if (!text) return;
  page.drawText(text, { x, y: py(topY, size), font, size, color });
}

// Wrap text string into lines that fit maxWidth
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of String(text ?? "").split("\n")) {
    const words = para.split(" ").filter(Boolean);
    if (!words.length) { out.push(""); continue; }
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        out.push(line); line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

// Draw wrapped text, advance ctx.y, return new y
function drawWrapped(
  ctx: Ctx,
  text: string,
  x: number,
  font: PDFFont,
  size: number,
  color: Color,
  maxW: number,
  leading = 1.55
): void {
  const lines = wrap(text, font, size, maxW);
  for (const line of lines) {
    need(ctx, size * leading + 2);
    dt(ctx.page, line, x, ctx.y, font, size, color);
    ctx.y += Math.ceil(size * leading);
  }
}

// ── Section header — gold bar with dark text ──────────────────────────────────
function sectionHeader(ctx: Ctx, title: string): void {
  need(ctx, 30);
  ctx.y += 6;
  rect(ctx, ML - 4, ctx.y, CW + 8, 24, C.gold);
  dt(ctx.page, title, ML + 4, ctx.y + 4, ctx.bold, 11, C.navy);
  ctx.y += 32;
}

// ── Thin rule ─────────────────────────────────────────────────────────────────
function rule(ctx: Ctx, color = C.lgray): void {
  ctx.page.drawLine({
    start: { x: ML, y: PH - ctx.y },
    end:   { x: MR, y: PH - ctx.y },
    thickness: 0.5,
    color,
  });
  ctx.y += 8;
}

// ── Checkbox bullet (□ + text) ────────────────────────────────────────────────
function checkBullet(ctx: Ctx, text: string): void {
  need(ctx, 20);
  // Draw empty checkbox square
  ctx.page.drawRectangle({
    x:      ML,
    y:      PH - ctx.y - 10,
    width:  9,
    height: 9,
    borderColor: C.black,
    borderWidth: 0.8,
    color:  C.white,
  });
  drawWrapped(ctx, text, ML + 15, ctx.reg, 9.5, C.black, CW - 15);
  ctx.y += 2;
}

// ── Bullet point ──────────────────────────────────────────────────────────────
function bullet(ctx: Ctx, text: string, color = C.black, size = 9.5): void {
  need(ctx, size * 2);
  dt(ctx.page, "•", ML, ctx.y, ctx.bold, size, color);
  drawWrapped(ctx, text, ML + 12, ctx.reg, size, color, CW - 12);
  ctx.y += 1;
}

// ── Platform status badge ─────────────────────────────────────────────────────
function statusBadge(ctx: Ctx, status: string): void {
  const color: Record<string, Color> = {
    OK:      C.green,
    ISSUE:   C.amber,
    REMOVE:  C.red,
    MISSING: C.muted,
  };
  const bg = color[status] ?? C.muted;
  const w  = 52;
  rect(ctx, ML, ctx.y + 1, w, 13, bg);
  const sw = ctx.bold.widthOfTextAtSize(status, 7);
  dt(ctx.page, status, ML + (w - sw) / 2, ctx.y + 2, ctx.bold, 7, C.white);
}

// ── First name extraction ─────────────────────────────────────────────────────
function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAuditPdf(
  result: AuditResult,
  advisor: AdvisorInfo,
  auditDate: Date
): Promise<Buffer> {
  const doc   = await PDFDocument.create();
  const reg   = await doc.embedFont(StandardFonts.Helvetica);
  const bold  = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = {
    doc, page: doc.addPage(PageSizes.Letter),
    y: 50, reg, bold, pageNum: 1,
  };

  // ── Null-safe defaults for older/partial audits ───────────────────────────
  const nap    = result.extractedNap    ?? {};
  const score  = result.score           ?? 0;
  const sBreak = result.scoreBreakdown  ?? {
    listingsHealth:        { score: 0, max: 30, notes: "No data." },
    reviews:               { score: 0, max: 20, notes: "No data." },
    websiteLocalRelevance: { score: 0, max: 20, notes: "No data." },
    brandConsistency:      { score: 0, max: 15, notes: "No data." },
    aiSearchReadiness:     { score: 0, max: 15, notes: "No data." },
  };
  const items      = result.actionItems     ?? [];
  const conflicts  = result.conflicts       ?? [];
  const socials    = result.socials         ?? [];
  const qv         = result.queryVisibility ?? {
    branded: "", nonBranded: "",
    topicClusters: [], missedOpportunities: [], serviceAreaExpansion: "",
  };

  // ── PAGE 1: Logo header + score + canonical entity ────────────────────────

  // Logo area — white background implied, draw "NEO HOME LOANS" header
  ctx.page.drawRectangle({ x: 0, y: PH - 72, width: PW, height: 72, color: C.white });

  // Centered logo text block
  const logoLine1 = "NEO HOME LOANS";
  const lw1 = bold.widthOfTextAtSize(logoLine1, 18);
  dt(ctx.page, logoLine1, (PW - lw1) / 2, ctx.y + 4, bold, 18, C.navy);

  const logoLine2 = "powered by Better";
  const lw2 = reg.widthOfTextAtSize(logoLine2, 10);
  dt(ctx.page, logoLine2, (PW - lw2) / 2, ctx.y + 28, reg, 10, C.muted);

  ctx.y = 78;

  // Thin gold rule under header
  ctx.page.drawLine({
    start: { x: 0, y: PH - ctx.y },
    end:   { x: PW, y: PH - ctx.y },
    thickness: 2,
    color: C.gold,
  });
  ctx.y += 14;

  // Date
  const dateStr = auditDate.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  dt(ctx.page, dateStr, ML, ctx.y, reg, 10, C.gray);
  ctx.y += 22;

  // ── Score headline ─────────────────────────────────────────────────────────
  const sColor = scoreColor(score);
  const headPrefix = `${advisor.name} Online Trust Score: `;
  const headScore  = `${score}/100`;
  const headSize   = 22;
  dt(ctx.page, headPrefix, ML, ctx.y, bold, headSize, C.black);
  const prefW = bold.widthOfTextAtSize(headPrefix, headSize);
  dt(ctx.page, headScore, ML + prefW, ctx.y, bold, headSize, sColor);
  ctx.y += Math.ceil(headSize * 1.6);

  // ── Canonical entity statement ─────────────────────────────────────────────
  if (result.canonicalEntityStatement) {
    drawWrapped(ctx, result.canonicalEntityStatement, ML, bold, 10.5, C.black, CW);
    ctx.y += 4;
  }

  // ── NAP bullets ───────────────────────────────────────────────────────────
  const napBullets: Array<[string, string]> = [
    ["N [name]",             [nap.name, nap.teamName].filter(Boolean).join(" | ")
                             || advisor.name],
    ["A [address]",          nap.address
                             || [advisor.streetAddress, advisor.city, advisor.state, advisor.zip]
                                .filter(Boolean).join(", ")],
    ["P [phone number]",     nap.phone  || advisor.phone  || ""],
    ["Email",                nap.email  || advisor.email  || ""],
    ["Title",                nap.title  || advisor.title  || ""],
    ["Category",             nap.category || advisor.category || ""],
    ["Top Service Area/Market", nap.serviceArea || advisor.serviceArea || ""],
  ].filter(([, v]) => v) as Array<[string, string]>;

  for (const [label, value] of napBullets) {
    need(ctx, 16);
    const labelStr = `${label} - `;
    const labelW   = bold.widthOfTextAtSize(labelStr, 10);
    // Draw a small open circle as a bullet (◦ is not in WinAnsi, so we draw it)
    ctx.page.drawEllipse({
      x: ML + 13,
      y: py(ctx.y + 5, 0) + 2,
      xScale: 3,
      yScale: 3,
      borderColor: C.black,
      borderWidth: 0.7,
      color: C.white,
    });
    dt(ctx.page, labelStr, ML + 22, ctx.y, bold, 10, C.black);
    drawWrapped(ctx, value, ML + 22 + labelW, reg, 10, C.black, CW - 22 - labelW);
    ctx.y += 2;
  }

  // Primary URL line
  if (nap.primaryUrl) {
    need(ctx, 18);
    ctx.y += 4;
    const urlLabel = "Primary URL: ";
    const urlLabelW = bold.widthOfTextAtSize(urlLabel, 10);
    dt(ctx.page, urlLabel, ML, ctx.y, bold, 10, C.black);
    dt(ctx.page, nap.primaryUrl, ML + urlLabelW, ctx.y, reg, 10, C.muted);
    if (nap.primaryUrlNote) {
      const urlW = reg.widthOfTextAtSize(nap.primaryUrl, 10);
      dt(ctx.page, `  ${nap.primaryUrlNote}`, ML + urlLabelW + urlW, ctx.y, reg, 10, C.teal);
    }
    ctx.y += 18;
  }

  // ── PRIORITY ACTION PLAN ───────────────────────────────────────────────────
  sectionHeader(ctx, "Priority Action Plan");

  // "FirstName To-Do:" subheader
  const toDoLabel = `${firstName(advisor.name)} To-Do:`;
  dt(ctx.page, toDoLabel, ML, ctx.y, bold, 11, C.teal);
  ctx.y += 20;

  for (const item of items) {
    need(ctx, 30);

    // Priority number
    const numStr  = `${item.priority}.`;
    const numW    = bold.widthOfTextAtSize(numStr, 10.5);
    dt(ctx.page, numStr, ML, ctx.y, bold, 10.5, C.black);

    // Split action into "Bold term:" and rest
    const colonIdx = item.action.indexOf(":");
    let boldPart  = "";
    let restPart  = item.action;

    if (colonIdx > 0 && colonIdx < 60) {
      boldPart = item.action.slice(0, colonIdx + 1);   // includes colon
      restPart = item.action.slice(colonIdx + 1).trimStart();
    }

    const textX = ML + numW + 4;
    const textW = CW - numW - 4;

    if (boldPart) {
      // Bold term on first line
      const bw = bold.widthOfTextAtSize(boldPart + " ", 10.5);
      dt(ctx.page, boldPart, textX, ctx.y, bold, 10.5, C.black);
      // Rest of action text after bold term (same line if fits, else wrap)
      const firstLineRest = wrap(restPart, reg, 10.5, textW - bw);
      if (firstLineRest[0]) {
        dt(ctx.page, " " + firstLineRest[0], textX + bw, ctx.y, reg, 10.5, C.black);
      }
      ctx.y += Math.ceil(10.5 * 1.6);
      for (let i = 1; i < firstLineRest.length; i++) {
        need(ctx, 16);
        dt(ctx.page, firstLineRest[i], textX, ctx.y, reg, 10.5, C.black);
        ctx.y += Math.ceil(10.5 * 1.5);
      }
    } else {
      drawWrapped(ctx, restPart, textX, reg, 10.5, C.black, textW);
    }

    // URL shown as small clickable-style text
    if (item.url) {
      need(ctx, 14);
      dt(ctx.page, item.url.slice(0, 85), textX, ctx.y, reg, 7.5, C.muted);
      ctx.y += 13;
    }
    ctx.y += 5;
  }

  // ── CORE IDENTITY CONFLICTS ────────────────────────────────────────────────
  if (conflicts.length > 0) {
    sectionHeader(ctx, "Core identity conflicts:");

    for (const c of conflicts) {
      checkBullet(ctx, c);
    }
    ctx.y += 8;

    // Repeat canonical NAP as the authoritative reference
    rule(ctx, C.lgray);
    const napRef = [
      nap.name ? `N [name] - ${[nap.name, nap.teamName].filter(Boolean).join(" | ")}` : null,
      nap.address    ? `A [address] - ${nap.address}` : null,
      nap.phone      ? `P [phone number] - ${nap.phone}` : null,
      nap.email      ? `Email - ${nap.email}` : null,
      nap.title      ? `Title - ${nap.title}` : null,
      nap.category   ? `Category - ${nap.category}` : null,
      nap.serviceArea ? `Top Service Area/Market: ${nap.serviceArea}` : null,
    ].filter(Boolean) as string[];

    for (const line of napRef) {
      need(ctx, 16);
      const idx = line.indexOf(" - ");
      if (idx > 0) {
        const lbl = line.slice(0, idx + 3);
        const val = line.slice(idx + 3);
        const lw  = bold.widthOfTextAtSize(lbl, 10);
        dt(ctx.page, lbl, ML + 10, ctx.y, bold, 10, C.black);
        drawWrapped(ctx, val, ML + 10 + lw, reg, 10, C.black, CW - 10 - lw);
      } else {
        drawWrapped(ctx, line, ML + 10, reg, 10, C.black, CW - 10);
      }
      ctx.y += 2;
    }
    ctx.y += 10;
  }

  // ── CANONICAL BLOCK ────────────────────────────────────────────────────────
  if (result.canonicalBlock || result.canonicalPublicDisplay || result.positioningStatement || result.bestDifferenceLanguage) {
    sectionHeader(ctx, `${firstName(advisor.name)} Canonical Block - KEEP CONSISTENT EVERYWHERE`);

    if (result.canonicalBlock) {
      const canonLines = result.canonicalBlock.split("\\n").join("\n").split("\n");
      const boxH = canonLines.length * 14 + 16;
      need(ctx, boxH + 20);
      rect(ctx, ML - 4, ctx.y - 4, CW + 8, boxH, C.lgray);
      for (const line of canonLines) {
        need(ctx, 14);
        drawWrapped(ctx, line, ML + 6, reg, 9.5, C.navy, CW - 12);
      }
      ctx.y += 10;
    }

    if (result.canonicalPublicDisplay) {
      need(ctx, 20);
      const lbl = "Best canonical public display format: ";
      const lblW = bold.widthOfTextAtSize(lbl, 9.5);
      dt(ctx.page, lbl, ML, ctx.y, bold, 9.5, C.black);
      drawWrapped(ctx, result.canonicalPublicDisplay, ML + lblW, reg, 9.5, C.navy, CW - lblW);
      ctx.y += 8;
    }

    if (result.positioningStatement) {
      need(ctx, 30);
      dt(ctx.page, "Positioning statement to use everywhere:", ML, ctx.y, bold, 10, C.black);
      ctx.y += 14;
      drawWrapped(ctx, result.positioningStatement, ML + 10, reg, 10, C.teal, CW - 10);
      ctx.y += 8;
    }

    if (result.bestDifferenceLanguage) {
      need(ctx, 24);
      dt(ctx.page, `Best difference language for ${firstName(advisor.name)}:`, ML, ctx.y, bold, 10, C.black);
      ctx.y += 14;
      drawWrapped(ctx, result.bestDifferenceLanguage, ML + 10, reg, 10, C.black, CW - 10);
      ctx.y += 10;
    }
  }

  // Audience analysis
  if (result.mainAudienceServed) {
    need(ctx, 30);
    dt(ctx.page, "Main Audience Served:", ML, ctx.y, bold, 10.5, C.black);
    ctx.y += 16;
    drawWrapped(ctx, result.mainAudienceServed, ML, reg, 10, C.black, CW);
    ctx.y += 8;
  }

  if (result.whoYouAppearToServe) {
    need(ctx, 30);
    dt(ctx.page, "Who you appear to serve:", ML, ctx.y, bold, 10.5, C.black);
    ctx.y += 16;
    drawWrapped(ctx, result.whoYouAppearToServe, ML, reg, 10, C.black, CW);
    ctx.y += 8;
  }

  if (result.perceivedStrengths?.length) {
    need(ctx, 30);
    dt(ctx.page, "Top 3 perceived strengths from public sentiment:", ML, ctx.y, bold, 10.5, C.black);
    ctx.y += 16;
    const letters = ["a.", "b.", "c."];
    result.perceivedStrengths.slice(0, 3).forEach((s, i) => {
      need(ctx, 16);
      const lbl = letters[i] ?? `${i + 1}.`;
      dt(ctx.page, lbl, ML + 14, ctx.y, reg, 10, C.black);
      drawWrapped(ctx, s, ML + 30, reg, 10, C.black, CW - 30);
      ctx.y += 2;
    });
    ctx.y += 8;
  }

  // ── LINKS / SOCIALS ────────────────────────────────────────────────────────
  if (socials.length > 0) {
    sectionHeader(ctx, "Links/Socials");

    for (const s of socials) {
      need(ctx, 28);

      if (s.status !== "OK") {
        statusBadge(ctx, s.status);
      }

      const xOffset = s.status !== "OK" ? ML + 58 : ML;
      const availW  = CW - (s.status !== "OK" ? 58 : 0);

      // Platform name bold
      const platStr = `${s.platform}: `;
      const platW   = bold.widthOfTextAtSize(platStr, 10);
      dt(ctx.page, platStr, xOffset, ctx.y + 1, bold, 10,
        s.status === "REMOVE" ? C.remove : C.black);

      // URL
      const urlColor = s.status === "REMOVE" ? C.remove : C.muted;
      const urlLines = wrap(s.url, reg, 9, availW - platW);
      dt(ctx.page, urlLines[0] ?? "", xOffset + platW, ctx.y + 1, reg, 9, urlColor);
      ctx.y += 15;

      // Notes if any
      if (s.notes) {
        drawWrapped(ctx, `  ${s.notes}`, xOffset, reg, 9, C.gray, availW);
      }
      ctx.y += 3;
    }
    ctx.y += 6;
  }

  // ── MISSING / UNCONFIRMED FOOTPRINT ───────────────────────────────────────
  if (result.missingFootprintNote || result.dataAggregatorNote) {
    sectionHeader(ctx, "Missing or unconfirmed high-authority footprint");

    if (result.missingFootprintNote) {
      dt(ctx.page, "Not detected in this audit (Unverified absence):", ML, ctx.y, bold, 10, C.black);
      ctx.y += 15;
      drawWrapped(ctx, result.missingFootprintNote, ML, reg, 10, C.black, CW);
      ctx.y += 8;
    }
    if (result.dataAggregatorNote) {
      dt(ctx.page, "Data aggregator presence:", ML, ctx.y, bold, 10, C.black);
      ctx.y += 15;
      drawWrapped(ctx, result.dataAggregatorNote, ML, reg, 10, C.black, CW);
      ctx.y += 8;
    }
  }

  // ── VISIBILITY SCORE ───────────────────────────────────────────────────────
  sectionHeader(ctx, "Visibility Score");

  const scoreCategories = [
    { label: "Listings Health",              data: sBreak.listingsHealth },
    { label: "Reviews and Reputation",       data: sBreak.reviews },
    { label: "Website Local Relevance",      data: sBreak.websiteLocalRelevance },
    { label: "Brand and Entity Consistency", data: sBreak.brandConsistency },
    { label: "AI Search Readiness",          data: sBreak.aiSearchReadiness },
  ];

  scoreCategories.forEach((cat, i) => {
    need(ctx, 50);

    // "N) Category: X / Y"
    const prefix  = `${i + 1}) ${cat.label}: `;
    const scoreStr = `${cat.data.score ?? 0} / ${cat.data.max}`;
    const prefW   = bold.widthOfTextAtSize(prefix, 11);
    dt(ctx.page, prefix, ML, ctx.y, bold, 11, C.black);
    dt(ctx.page, scoreStr, ML + prefW, ctx.y, bold, 11, scoreColor(Math.round(((cat.data.score ?? 0) / (cat.data.max)) * 100)));
    ctx.y += 18;

    // Bullet paragraph explanation
    if (cat.data.notes) {
      bullet(ctx, cat.data.notes, C.black, 9.5);
    }
    ctx.y += 8;
  });

  // ── QUERY VISIBILITY MAP ───────────────────────────────────────────────────
  sectionHeader(ctx, "Query Visibility Map");

  if (qv.branded) {
    need(ctx, 28);
    dt(ctx.page, "Current branded visibility", ML, ctx.y, bold, 10.5, C.black);
    ctx.y += 16;
    bullet(ctx, qv.branded, C.black, 9.5);
    ctx.y += 6;
  }

  if (qv.nonBranded) {
    need(ctx, 28);
    dt(ctx.page, "Current non-branded visibility", ML, ctx.y, bold, 10.5, C.black);
    ctx.y += 16;
    bullet(ctx, qv.nonBranded, C.black, 9.5);
    ctx.y += 6;
  }

  if (qv.topicClusters?.length) {
    need(ctx, 28);
    dt(ctx.page, "Best current topic clusters", ML, ctx.y, bold, 10.5, C.black);
    ctx.y += 16;
    for (const tc of qv.topicClusters) {
      bullet(ctx, tc, C.black, 9.5);
    }
    ctx.y += 6;
  }

  if (qv.missedOpportunities?.length) {
    need(ctx, 30);
    dt(ctx.page, "Missed high-intent search opportunities", ML, ctx.y, bold, 10.5, C.black);
    ctx.y += 14;
    dt(ctx.page, "You currently appear under-optimized for these query clusters:", ML, ctx.y, reg, 10, C.teal);
    ctx.y += 16;

    for (const opp of qv.missedOpportunities) {
      need(ctx, 20);
      // Split "Category: items" into bold label + regular items
      const ci = opp.indexOf(":");
      if (ci > 0 && ci < 40) {
        const catLabel = opp.slice(0, ci + 1);
        const catItems = opp.slice(ci + 1).trimStart();
        const clW = bold.widthOfTextAtSize(catLabel + " ", 10);
        dt(ctx.page, "•", ML + 8, ctx.y, bold, 10, C.black);
        dt(ctx.page, catLabel, ML + 18, ctx.y, bold, 10, C.black);
        drawWrapped(ctx, catItems, ML + 18 + clW, reg, 10, C.black, CW - 18 - clW);
      } else {
        bullet(ctx, opp, C.black, 10);
      }
      ctx.y += 2;
    }
    ctx.y += 6;
  }

  // ── SERVICE AREA EXPANSION ─────────────────────────────────────────────────
  if (qv.serviceAreaExpansion) {
    sectionHeader(ctx, "Service area expansion opportunity");
    bullet(ctx, qv.serviceAreaExpansion, C.black, 9.5);
    ctx.y += 8;
  }

  // ── SET UP NEW CHANNELS ────────────────────────────────────────────────────
  if (result.newChannels) {
    const nc = result.newChannels;
    const hasAny = nc.required?.length || nc.recommended?.length || nc.optional?.length;
    if (hasAny) {
      sectionHeader(ctx, "Set Up New Channels");

      const tiers: Array<{ label: string; items: string[]; color: Color }> = [
        { label: "Required",    items: nc.required    ?? [], color: C.red    },
        { label: "Recommended", items: nc.recommended ?? [], color: C.amber  },
        { label: "Optional",    items: nc.optional    ?? [], color: C.teal   },
      ];

      for (const tier of tiers) {
        if (!tier.items.length) continue;
        need(ctx, 20);
        dt(ctx.page, `${tier.label}:`, ML, ctx.y, bold, 10, tier.color);
        ctx.y += 14;
        for (const item of tier.items) {
          bullet(ctx, item, C.black, 9.5);
        }
        ctx.y += 4;
      }
      ctx.y += 4;
    }
  }

  // ── COMPETITIVE GAP ANALYSIS ───────────────────────────────────────────────
  if (result.competitiveGapAnalysis) {
    const cga = result.competitiveGapAnalysis;
    if (cga.advantages?.length || cga.gaps?.length) {
      sectionHeader(ctx, "Competitive Gap Analysis");

      if (cga.advantages?.length) {
        need(ctx, 20);
        dt(ctx.page, "Your Advantages:", ML, ctx.y, bold, 10, C.green);
        ctx.y += 14;
        for (const a of cga.advantages) bullet(ctx, a, C.black, 9.5);
        ctx.y += 6;
      }

      if (cga.gaps?.length) {
        need(ctx, 20);
        dt(ctx.page, "Gaps to Close:", ML, ctx.y, bold, 10, C.amber);
        ctx.y += 14;
        for (const g of cga.gaps) bullet(ctx, g, C.black, 9.5);
        ctx.y += 6;
      }
    }
  }

  // ── CONTENT THEMES ─────────────────────────────────────────────────────────
  if (result.contentThemes?.length) {
    sectionHeader(ctx, `Best Recurring Content Themes for ${firstName(advisor.name)}`);

    result.contentThemes.forEach((theme, i) => {
      need(ctx, 18);
      const numStr = `${i + 1}. `;
      const numW = bold.widthOfTextAtSize(numStr, 10);
      dt(ctx.page, numStr, ML, ctx.y, bold, 10, C.navy);
      drawWrapped(ctx, theme, ML + numW, reg, 10, C.black, CW - numW);
      ctx.y += 4;
    });
    ctx.y += 6;
  }

  // ── FOOTER on last page ────────────────────────────────────────────────────
  const footerY = PH - 28;
  ctx.page.drawRectangle({ x: 0, y: 0, width: PW, height: 28, color: C.navy });
  const footerText = `NEO Home Loans Visibility Audit  |  ${advisor.name}  |  Generated ${auditDate.toLocaleDateString()}  |  Powered by Claude AI`;
  const fw = reg.widthOfTextAtSize(footerText, 7.5);
  ctx.page.drawText(footerText, {
    x: (PW - fw) / 2,
    y: 9,
    font: reg,
    size: 7.5,
    color: C.white,
  });

  // suppress unused variable warning
  void footerY;

  const bytes = await ctx.doc.save();
  return Buffer.from(bytes);
}
