import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
      if (typeof v === "object" && v !== null) {
        const obj = v as Record<string, string>;
        if ("first" in obj || "last" in obj) {
          const full = [obj.first, obj.last].filter(Boolean).join(" ").trim();
          if (full) return full;
        }
        if ("area" in obj || "phone" in obj) {
          const num = [(obj.area ?? ""), (obj.phone ?? "")].filter(Boolean).join("");
          if (num) return num;
        }
      }
    }
  }
  return null;
}

// Map of platform keys to search keywords for detecting social URLs in the form
const PLATFORM_KEYWORDS: Array<{
  platform: string;
  keywords: string[];
}> = [
  { platform: "WEBSITE",         keywords: ["primary url", "website", "main url", "neosite", "personal site"] },
  { platform: "LINKEDIN",        keywords: ["linkedin"] },
  { platform: "FACEBOOK",        keywords: ["facebook", "fb page", "facebook business", "facebook profile"] },
  { platform: "INSTAGRAM",       keywords: ["instagram", "ig url"] },
  { platform: "YOUTUBE",         keywords: ["youtube", "yt channel"] },
  { platform: "ZILLOW",          keywords: ["zillow"] },
  { platform: "GOOGLE_BUSINESS", keywords: ["google business", "google my business", "gmb", "google profile"] },
  { platform: "YELP",            keywords: ["yelp"] },
  { platform: "TIKTOK",          keywords: ["tiktok"] },
  { platform: "X",               keywords: ["twitter", "x.com", "x url"] },
  { platform: "THREADS",         keywords: ["threads"] },
];

function extractSocialUrls(fields: Record<string, unknown>): Array<{ platform: string; url: string; label: string }> {
  const results: Array<{ platform: string; url: string; label: string }> = [];
  const seen = new Set<string>();

  for (const { platform, keywords } of PLATFORM_KEYWORDS) {
    for (const keyword of keywords) {
      const url = findField(fields, keyword);
      if (url && url.startsWith("http") && !seen.has(platform)) {
        seen.add(platform);
        results.push({ platform, url, label: keyword });
        break;
      }
    }
  }

  // Also catch any extra URLs not in our list (Experience.com, BBB, etc.)
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string" && v.startsWith("http") && !seen.has(k)) {
      const kl = k.toLowerCase();
      if (
        kl.includes("experience") || kl.includes("bbb") ||
        kl.includes("bing") || kl.includes("apple") ||
        kl.includes("whodoyou") || kl.includes("chamber")
      ) {
        results.push({ platform: "OTHER", url: v.trim(), label: k });
      }
    }
  }

  return results;
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
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") topLevel[k] = v;
      }
      const rawJson = topLevel.rawRequest;
      if (rawJson) {
        try { fields = JSON.parse(rawJson); } catch { fields = topLevel; }
      } else {
        fields = topLevel;
      }
    } else {
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

    // Extract canonical NAP fields
    const submissionId = topLevel.submissionID ?? topLevel.submission_id ?? null;
    const nmls        = findField(fields, "nmls", "license number", "nmlsid");
    const name        = findField(fields, "advisor name", "fullname", "full name", "name");
    const teamName    = findField(fields, "team name", "team", "brand");
    const phone       = findField(fields, "phone", "cell", "mobile", "direct");
    const email       = findField(fields, "email");
    const street      = findField(fields, "street", "address line 1", "street address");
    const city        = findField(fields, "city");
    const state       = findField(fields, "state");
    const zip         = findField(fields, "zip", "postal");
    const title       = findField(fields, "title", "job title", "position");
    const category    = findField(fields, "category", "business category", "business type");
    const serviceArea = findField(fields, "service area", "market", "primary market", "top market");
    const napNotes    = findField(fields, "notes", "additional", "instructions", "other");
    const socialUrls  = extractSocialUrls(fields);

    // Must have NMLS to match advisor
    if (!nmls) {
      console.warn("[NAP webhook] No NMLS number found in submission");
      return NextResponse.json({ ok: false, error: "No NMLS number found" }, { status: 422 });
    }

    // Find the advisor by NMLS number
    const advisor = await db.advisor.findFirst({
      where: { nmlsNumber: { contains: nmls.replace(/\D/g, ""), mode: "insensitive" } },
    });

    if (!advisor) {
      console.warn(`[NAP webhook] No advisor found for NMLS: ${nmls}`);
      return NextResponse.json({ ok: false, error: `No advisor found for NMLS ${nmls}` }, { status: 404 });
    }

    // Build update payload — only overwrite fields that came in the form
    const updateData: Record<string, string | null> = {};
    if (name)        updateData.name        = name;
    if (teamName)    updateData.brand       = teamName;
    if (phone)       updateData.phone       = phone;
    if (email)       updateData.email       = email;
    if (street)      updateData.streetAddress = street;
    if (city)        updateData.city        = city;
    if (state)       updateData.state       = state;
    if (zip)         updateData.zip         = zip;
    if (title)       updateData.title       = title;
    if (category)    updateData.category    = category;
    if (serviceArea) updateData.serviceArea = serviceArea;
    if (napNotes)    updateData.napNotes    = napNotes;

    await db.advisor.update({
      where: { id: advisor.id },
      data: updateData,
    });

    // Upsert each social channel URL
    for (const { platform, url, label } of socialUrls) {
      const existing = await db.advisorChannel.findFirst({
        where: { advisorId: advisor.id, platform: platform as never },
      });

      if (existing) {
        await db.advisorChannel.update({
          where: { id: existing.id },
          data: { url, label },
        });
      } else {
        await db.advisorChannel.create({
          data: {
            advisorId: advisor.id,
            platform: platform as never,
            url,
            label,
          },
        });
      }
    }

    console.log(
      `[NAP webhook] Updated advisor ${advisor.name} (NMLS ${nmls}) — ` +
      `${Object.keys(updateData).length} fields, ${socialUrls.length} channels`
    );

    return NextResponse.json({
      ok: true,
      advisorId: advisor.id,
      advisorName: advisor.name,
      fieldsUpdated: Object.keys(updateData),
      channelsUpdated: socialUrls.map((s) => s.platform),
      submissionId,
    });
  } catch (e) {
    console.error("[NAP webhook] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
