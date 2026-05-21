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
        // Phone number object: { area, phone }
        if ("area" in obj || "phone" in obj) {
          const num = [(obj.area ?? ""), (obj.phone ?? "")].filter(Boolean).join("");
          if (num) return num;
        }
        // Name object: { first, last }
        if ("first" in obj || "last" in obj) {
          const full = [obj.first, obj.last].filter(Boolean).join(" ").trim();
          if (full) return full;
        }
        // Address object — return street line 1
        if ("addr_line1" in obj) {
          return obj.addr_line1?.trim() ?? null;
        }
      }
    }
  }
  return null;
}

// Extract a specific component from a JotForm address object field.
// JotForm sends address fields as: { addr_line1, addr_line2, city, state, postal, country }
function findAddressComponent(
  fields: Record<string, unknown>,
  component: "addr_line1" | "addr_line2" | "city" | "state" | "postal"
): string | null {
  for (const [, v] of Object.entries(fields)) {
    if (typeof v !== "object" || v === null) continue;
    const obj = v as Record<string, string>;
    // Identify JotForm address objects by the presence of addr_line1 or city+state+postal
    if ("addr_line1" in obj || ("city" in obj && "state" in obj && "postal" in obj)) {
      if (component in obj && obj[component]?.trim()) {
        return obj[component].trim();
      }
    }
  }
  return null;
}

// Parse freeform social handles / URLs text into platform records.
// Handles full URLs, partial domains, and mixed lists.
function parseSocialHandles(text: string): Array<{ platform: string; url: string; label: string }> {
  const results: Array<{ platform: string; url: string; label: string }> = [];
  const seen = new Set<string>();

  // Split on whitespace, commas, semicolons, or pipe characters
  const tokens = text.split(/[\s,;|\n]+/).map((t) => t.trim()).filter(Boolean);

  for (const token of tokens) {
    let url = token;

    // Skip @handle-only tokens (no domain = ambiguous platform)
    if (url.startsWith("@") && !url.includes(".")) continue;

    // Prepend https:// if it looks like a domain but has no scheme
    if (!url.startsWith("http") && url.includes(".")) {
      url = "https://" + url;
    }

    // Only process things that look like URLs
    if (!url.startsWith("http")) continue;

    let platform: string | null = null;
    if (/linkedin\.com/i.test(url))                        platform = "LINKEDIN";
    else if (/facebook\.com|fb\.com/i.test(url))           platform = "FACEBOOK";
    else if (/instagram\.com/i.test(url))                  platform = "INSTAGRAM";
    else if (/youtube\.com|youtu\.be/i.test(url))          platform = "YOUTUBE";
    else if (/tiktok\.com/i.test(url))                     platform = "TIKTOK";
    else if (/twitter\.com|x\.com/i.test(url))             platform = "X";
    else if (/threads\.net/i.test(url))                    platform = "THREADS";
    else if (/zillow\.com/i.test(url))                     platform = "ZILLOW";
    else if (/google\.com\/maps|g\.page|goo\.gl/i.test(url)) platform = "GOOGLE_BUSINESS";
    else if (/yelp\.com/i.test(url))                       platform = "YELP";

    if (platform && !seen.has(platform)) {
      seen.add(platform);
      results.push({ platform, url, label: platform.toLowerCase() });
    }
  }

  return results;
}

// Parse the custom sites field (micro-website, LinkTree, Lynkspot, landing pages, etc.)
function parseCustomSites(text: string): Array<{ platform: string; url: string; label: string }> {
  const results: Array<{ platform: string; url: string; label: string }> = [];

  const tokens = text.split(/[\s,;\n]+/).map((t) => t.trim()).filter(Boolean);

  for (const token of tokens) {
    if (!token.includes(".")) continue;
    let url = token;
    if (!url.startsWith("http")) url = "https://" + url;

    let platform = "WEBSITE";
    let label = token;

    if (/linktr\.ee|linktree/i.test(url))  { platform = "OTHER"; label = "linktree"; }
    else if (/lynkspot/i.test(url))         { platform = "OTHER"; label = "lynkspot"; }

    results.push({ platform, url, label });
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

    const submissionId = topLevel.submissionID ?? topLevel.submission_id ?? null;

    // ── Extract canonical NAP fields ────────────────────────────────────────
    // "Business Name" = name on license / mortgage disclosures
    const name = findField(fields,
      "business name", "name on your license", "name on license",
      "advisor name", "fullname", "full name"
    );

    // "Team or Brand Name"
    const teamName = findField(fields, "team or brand", "team name", "brand name", "team", "brand");

    // Address — JotForm sends a single address field as an object
    const street     = findAddressComponent(fields, "addr_line1")
                    ?? findField(fields, "street address", "street", "address line 1");
    const city       = findAddressComponent(fields, "city")
                    ?? findField(fields, "city");
    const state      = findAddressComponent(fields, "state")
                    ?? findField(fields, "state", "province");
    const zip        = findAddressComponent(fields, "postal")
                    ?? findField(fields, "postal", "zip");

    // Contact
    const phone      = findField(fields, "phone number", "phone", "cell", "mobile", "direct");
    const email      = findField(fields, "email address", "email");

    // Professional
    const title      = findField(fields, "title", "job title", "position");

    // "Top 5 Markets or areas you serve"
    const serviceArea = findField(fields,
      "top 5 markets", "top markets", "areas you serve", "markets you serve",
      "service area", "primary market", "top market"
    );

    // "Who you typically serve / types of clients"
    const category   = findField(fields,
      "who you typically serve", "types of clients", "market is largely",
      "client types", "category", "business category"
    );

    // "Top 3 competitors in your market"
    const competitors = findField(fields,
      "top 3 competitors", "competitors", "competitor"
    );

    // Build napNotes from competitors (and any generic notes fields)
    const genericNotes = findField(fields, "notes", "additional", "instructions");
    const napNotes = [
      competitors ? `Competitors: ${competitors}` : null,
      genericNotes,
    ].filter(Boolean).join("\n\n") || null;

    // ── Social channels ─────────────────────────────────────────────────────
    // "Current social handles of known accounts even if some are owned by former companies"
    const socialHandlesRaw = findField(fields,
      "social handles", "social accounts", "current social", "known accounts"
    );

    // "Do you have a micro-website/LinkTree/Lynkspot Site..."
    const customSitesRaw = findField(fields,
      "micro-website", "linktree", "lynkspot", "custom sites", "domains here",
      "webinar landing", "landing page", "other custom"
    );

    const socialUrls: Array<{ platform: string; url: string; label: string }> = [
      ...(socialHandlesRaw ? parseSocialHandles(socialHandlesRaw) : []),
      ...(customSitesRaw   ? parseCustomSites(customSitesRaw)     : []),
    ];

    // De-dupe by platform (first occurrence wins)
    const seenPlatforms = new Set<string>();
    const dedupedSocials = socialUrls.filter(({ platform }) => {
      if (seenPlatforms.has(platform)) return false;
      seenPlatforms.add(platform);
      return true;
    });

    // ── Find advisor ─────────────────────────────────────────────────────────
    // Match by email first (most reliable), then fall back to name
    let advisor = null;

    if (email) {
      advisor = await db.advisor.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
    }

    if (!advisor && name) {
      advisor = await db.advisor.findFirst({
        where: { name: { contains: name, mode: "insensitive" } },
      });
    }

    if (!advisor) {
      console.warn(`[NAP webhook] No advisor found — email: ${email}, name: ${name}`);
      return NextResponse.json(
        { ok: false, error: `No advisor found matching email "${email}" or name "${name}"` },
        { status: 404 }
      );
    }

    // ── Build update payload — only overwrite fields that came in ─────────────
    const updateData: Record<string, string | null> = {};
    if (name)        updateData.name          = name;
    if (teamName)    updateData.brand         = teamName;
    if (phone)       updateData.phone         = phone;
    if (email)       updateData.email         = email;
    if (street)      updateData.streetAddress = street;
    if (city)        updateData.city          = city;
    if (state)       updateData.state         = state;
    if (zip)         updateData.zip           = zip;
    if (title)       updateData.title         = title;
    if (category)    updateData.category      = category;
    if (serviceArea) updateData.serviceArea   = serviceArea;
    if (napNotes)    updateData.napNotes      = napNotes;

    await db.advisor.update({
      where: { id: advisor.id },
      data: updateData,
    });

    // ── Upsert each social channel URL ────────────────────────────────────────
    for (const { platform, url, label } of dedupedSocials) {
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
      `[NAP webhook] Updated advisor ${advisor.name} via JotForm submission — ` +
      `${Object.keys(updateData).length} fields, ${dedupedSocials.length} channels`
    );

    return NextResponse.json({
      ok: true,
      advisorId: advisor.id,
      advisorName: advisor.name,
      fieldsUpdated: Object.keys(updateData),
      channelsUpdated: dedupedSocials.map((s) => s.platform),
      submissionId,
    });
  } catch (e) {
    console.error("[NAP webhook] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
