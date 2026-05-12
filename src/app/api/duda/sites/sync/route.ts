import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

const BASE = "https://api.duda.co/api";

function auth() {
  const user = process.env.DUDA_API_USER;
  const key = process.env.DUDA_API_KEY;
  if (!user || !key) return null;
  return "Basic " + Buffer.from(`${user}:${key}`).toString("base64");
}

function toProperName(domain: string): string {
  let slug = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\.loanswithneo\.com$/, "")
    .replace(/\.neohomeloans\.com$/, "")
    .replace(/\.dudasites\.com$/, "")
    .replace(/^www\./, "");

  if (slug.includes(".")) return slug;

  return slug
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

interface DudaApiSite {
  site_name: string;          // Duda's internal ID (what we store as siteId)
  site_domain?: string;       // custom domain if set
  site_default_domain?: string; // *.dudasites.com fallback
  publish_status?: string;    // PUBLISHED | NOT_PUBLISHED | ...
  external_uid?: string;
}

async function fetchAllSites(authHeader: string): Promise<DudaApiSite[]> {
  const all: DudaApiSite[] = [];
  let offset = 0;
  const limit = 100;

  for (;;) {
    const res = await fetch(
      `${BASE}/sites/multiscreen?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: authHeader, Accept: "application/json" } }
    );
    if (!res.ok) break;

    const json = await res.json();
    // Duda returns { results: [...] } or just an array depending on version
    const batch: DudaApiSite[] = Array.isArray(json) ? json : (json.results ?? json.sites ?? []);
    all.push(...batch);

    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}

export async function POST() {
  try {
    await requireAuth();

    const authHeader = auth();
    if (!authHeader) {
      return NextResponse.json({ error: "Duda API credentials not configured" }, { status: 500 });
    }

    const rawSites = await fetchAllSites(authHeader);

    // Filter to published only, build upsert data
    const published = rawSites.filter(
      (s) => !s.publish_status || s.publish_status === "PUBLISHED"
    );

    let added = 0;
    let updated = 0;

    for (const s of published) {
      if (!s.site_name) continue;

      // Prefer custom domain, fall back to default dudasites.com domain
      const rawDomain = s.site_domain || s.site_default_domain || "";
      const url = rawDomain
        ? rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`
        : "";

      const name = toProperName(rawDomain || s.site_name);

      const existing = await db.dudaSite.findUnique({ where: { siteId: s.site_name } });

      if (existing) {
        // Only update URL if it changed — preserve manually set names
        if (existing.url !== url) {
          await db.dudaSite.update({
            where: { siteId: s.site_name },
            data: { url },
          });
          updated++;
        }
      } else {
        await db.dudaSite.create({
          data: { siteId: s.site_name, name, url, isManual: false },
        });
        added++;
      }
    }

    // Return current full list
    const sites = await db.dudaSite.findMany({ orderBy: { name: "asc" } });

    return NextResponse.json({
      ok: true,
      added,
      updated,
      total: sites.length,
      publishedFromApi: published.length,
      sites,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
