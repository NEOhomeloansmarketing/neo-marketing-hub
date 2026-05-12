import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendNewRequestEmail } from "@/lib/email";

const DEFAULT_ASSIGNEE_NAME = "Zeph Davis";

async function getDefaultAssignee() {
  return db.user.findFirst({
    where: { name: { contains: DEFAULT_ASSIGNEE_NAME, mode: "insensitive" }, isActive: true },
    select: { id: true, name: true, email: true },
  });
}

// JotForm validates the webhook URL with a GET request first
export async function GET() {
  return NextResponse.json({ ok: true });
}


// Search all fields in the rawRequest JSON for a value matching any of the keywords
function findField(fields: Record<string, unknown>, ...keywords: string[]): string | null {
  for (const keyword of keywords) {
    const kl = keyword.toLowerCase();
    for (const [k, v] of Object.entries(fields)) {
      if (!k.toLowerCase().includes(kl)) continue;
      if (typeof v === "string" && v.trim()) return v.trim();
      // JotForm sends name/phone/date as objects
      if (typeof v === "object" && v !== null) {
        const obj = v as Record<string, string>;
        // Name: {first, last}
        if ("first" in obj || "last" in obj) {
          const full = [obj.first, obj.last].filter(Boolean).join(" ").trim();
          if (full) return full;
        }
        // Date: {year, month, day}
        if ("year" in obj && "month" in obj && "day" in obj) {
          const { year, month, day } = obj;
          if (year && month && day) return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        // Phone: {area, phone}
        if ("area" in obj || "phone" in obj) {
          const num = [(obj.area ?? ""), (obj.phone ?? "")].filter(Boolean).join("");
          if (num) return num;
        }
      }
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let topLevel: Record<string, string> = {};
    let fields: Record<string, unknown> = {};

    if (contentType.includes("application/json")) {
      fields = await request.json();
      topLevel = fields as Record<string, string>;
    } else if (contentType.includes("multipart/form-data")) {
      // Parse multipart — Next.js handles this natively
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") topLevel[k] = v;
      }
      // rawRequest contains the full structured JSON from JotForm
      const rawJson = topLevel.rawRequest;
      if (rawJson) {
        try { fields = JSON.parse(rawJson); } catch { fields = topLevel; }
      } else {
        fields = topLevel;
      }
    } else {
      // URL-encoded fallback
      const text = await request.text();
      for (const pair of text.split("&")) {
        const idx = pair.indexOf("=");
        if (idx === -1) continue;
        const k = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, " "));
        const v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " "));
        topLevel[k] = v;
      }
      const rawJson = topLevel.rawRequest;
      if (rawJson) {
        try { fields = JSON.parse(rawJson); } catch { fields = topLevel; }
      } else {
        fields = topLevel;
      }
    }

    const submissionId = topLevel.submissionID ?? topLevel.submission_id ?? null;

    // Deduplicate
    if (submissionId) {
      const existing = await db.marketingRequest.findUnique({ where: { submissionId } });
      if (existing) return NextResponse.json({ ok: true, duplicate: true });
    }

    const advisorName = findField(fields, "name", "fullname", "loanofficer", "advisor");
    const advisorEmail = findField(fields, "email");
    const advisorNmls = findField(fields, "nmls", "license");
    const rawType = findField(fields, "whattype", "type", "project", "service", "category");
    const description = findField(fields, "description", "canyou", "details", "notes", "message", "instructions");
    const titleFromForm = findField(fields, "title", "whatis", "subject", "headline", "name of");
    const dueDateRaw = findField(fields, "due", "deadline", "requested");

    const title =
      titleFromForm ??
      (rawType ? `${rawType} request` : "Marketing request") +
      (advisorName ? ` — ${advisorName}` : "");

    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

    // Collect any file upload URLs JotForm includes in the submission
    const attachmentUrls: string[] = [];
    for (const v of Object.values(fields)) {
      if (typeof v === "string" && v.startsWith("http") && /\.(pdf|jpg|jpeg|png|gif|doc|docx|mp4|mov|zip)/i.test(v)) {
        attachmentUrls.push(v);
      }
      // JotForm sometimes sends file arrays
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && item.startsWith("http")) attachmentUrls.push(item);
        }
      }
    }

    // Auto-assign to Zeph Davis
    const assignee = await getDefaultAssignee();

    const created = await db.marketingRequest.create({
      data: {
        title,
        description: description ?? null,
        requestType: rawType ?? "Other",
        status: "NEW",
        priority: "MEDIUM",
        advisorName: advisorName ?? null,
        advisorEmail: advisorEmail ?? null,
        advisorNmls: advisorNmls ?? null,
        assigneeId: assignee?.id ?? null,
        dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
        submissionId: submissionId ?? null,
        jotformFormId: topLevel.formID ?? null,
        formData: fields as any,
        attachmentUrls,
      },
    });

    // Email Zeph
    if (assignee) {
      sendNewRequestEmail({
        to: assignee.email,
        recipientName: assignee.name,
        requestTitle: title,
        requestType: rawType ?? "Other",
        advisorName: advisorName ?? null,
        description: description ?? null,
        link: `/requests`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("JotForm webhook error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
