import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// JotForm sends form submissions as multipart/form-data or x-www-form-urlencoded
// Fields come through as q{N}_{fieldSlug}: value pairs

function extractField(data: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(data)) {
      const kl = k.toLowerCase();
      if (kl.includes(lower) && v && v.trim()) return v.trim();
    }
  }
  return null;
}

function toRequestType(raw: string | null): string {
  if (!raw) return "OTHER";
  const r = raw.toLowerCase();
  if (r.includes("social")) return "SOCIAL_POST";
  if (r.includes("flyer") || r.includes("print")) return "FLYER";
  if (r.includes("email") || r.includes("newsletter")) return "EMAIL";
  if (r.includes("video") || r.includes("reel")) return "VIDEO";
  if (r.includes("graphic") || r.includes("banner") || r.includes("ad")) return "GRAPHIC";
  if (r.includes("headshot") || r.includes("photo")) return "HEADSHOT";
  if (r.includes("bio") || r.includes("profile")) return "BIO";
  return "OTHER";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let fields: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      fields = await request.json();
    } else {
      // JotForm sends URL-encoded or form-data
      const text = await request.text();
      for (const pair of text.split("&")) {
        const idx = pair.indexOf("=");
        if (idx === -1) continue;
        const k = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, " "));
        const v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " "));
        fields[k] = v;
      }
    }

    const submissionId = fields.submissionID ?? fields.submission_id ?? null;

    // Deduplicate
    if (submissionId) {
      const existing = await db.marketingRequest.findUnique({ where: { submissionId } });
      if (existing) return NextResponse.json({ ok: true, duplicate: true });
    }

    // Extract common fields
    const advisorName = extractField(fields, "name", "fullname", "advisor", "loanofficer", "loanOfficer");
    const advisorEmail = extractField(fields, "email");
    const advisorNmls = extractField(fields, "nmls", "nmlsid", "license");
    const rawType = extractField(fields, "type", "requesttype", "requestType", "category", "service");
    const description = extractField(fields, "description", "details", "message", "request", "notes", "instructions", "what");
    const title = extractField(fields, "title", "subject", "headline") ??
      (rawType ? `${rawType} request` : "Marketing request") +
      (advisorName ? ` — ${advisorName}` : "");
    const dueDateRaw = extractField(fields, "due", "deadline", "duedate", "by");
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

    await db.marketingRequest.create({
      data: {
        title,
        description: description ?? null,
        requestType: toRequestType(rawType) as any,
        status: "NEW",
        priority: "MEDIUM",
        advisorName: advisorName ?? null,
        advisorEmail: advisorEmail ?? null,
        advisorNmls: advisorNmls ?? null,
        dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
        submissionId: submissionId ?? null,
        jotformFormId: fields.formID ?? null,
        formData: fields as any,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("JotForm webhook error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
