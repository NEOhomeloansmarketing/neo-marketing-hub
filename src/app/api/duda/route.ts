import { NextResponse } from "next/server";
import { DUDA_SITES } from "@/lib/duda-sites";

const BASE = "https://api.duda.co/api";

function auth() {
  const user = process.env.DUDA_API_USER;
  const key = process.env.DUDA_API_KEY;
  if (!user || !key) return null;
  return "Basic " + Buffer.from(`${user}:${key}`).toString("base64");
}

async function fetchAnalytics(siteId: string, from: string, to: string, authHeader: string) {
  try {
    const res = await fetch(`${BASE}/analytics/site/${siteId}?from=${from}&to=${to}`, {
      headers: { Authorization: authHeader, Accept: "application/json" },
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) return null;
    return await res.json() as { VISITORS: number; VISITS: number; PAGE_VIEWS: number };
  } catch { return null; }
}

async function fetchSiteDetails(siteId: string, authHeader: string) {
  try {
    const res = await fetch(`${BASE}/sites/multiscreen/${siteId}`, {
      headers: { Authorization: authHeader, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

// Batch helper — run promises in chunks to avoid rate limiting
async function batch<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const mode = searchParams.get("mode") ?? "analytics"; // analytics | details

  const authHeader = auth();
  if (!authHeader) return NextResponse.json({ error: "Duda API credentials not configured" }, { status: 500 });

  const end = endParam ?? toYMD(new Date());
  const start = startParam ?? (() => { const d = new Date(); d.setDate(d.getDate() - 30); return toYMD(d); })();

  try {
    if (mode === "details") {
      // Fetch site details for all sites (batched 10 at a time)
      const details = await batch(DUDA_SITES, 10, async (site) => {
        const d = await fetchSiteDetails(site.siteId, authHeader);
        return {
          siteId: site.siteId,
          name: site.name,
          url: site.url,
          publishStatus: d?.publish_status ?? "UNKNOWN",
          lastPublished: d?.last_published_date ?? null,
          firstPublished: d?.first_published_date ?? null,
          modificationDate: d?.modification_date ?? null,
          seoTitle: d?.site_seo?.title ?? null,
          seoDescription: d?.site_seo?.description ?? null,
          noIndex: d?.site_seo?.no_index ?? false,
          schemaStatus: d?.schemas?.local_business?.status ?? null,
          missingSchemaFields: d?.schemas?.local_business?.missing_recommended_fields ?? [],
          certificateStatus: d?.certificate_status ?? null,
          thumbnail: d?.thumbnail_url ?? null,
          editUrl: d?.edit_site_url ?? null,
          previewUrl: d?.preview_site_url ?? null,
          businessEmail: d?.site_business_info?.email ?? null,
          businessPhone: d?.site_business_info?.phone_number ?? null,
          canonicalUrl: d?.canonical_url ?? site.url,
        };
      });
      return NextResponse.json({ details, dateRange: { start, end } });
    }

    // Analytics mode — fetch visitor/visit/pageview data for all sites
    const analytics = await batch(DUDA_SITES, 10, async (site) => {
      const stats = await fetchAnalytics(site.siteId, start, end, authHeader);
      return {
        siteId: site.siteId,
        name: site.name,
        url: site.url,
        visitors: stats?.VISITORS ?? 0,
        visits: stats?.VISITS ?? 0,
        pageViews: stats?.PAGE_VIEWS ?? 0,
      };
    });

    // Also fetch comparison period
    const rangeMs = new Date(end).getTime() - new Date(start).getTime();
    const prevEnd = new Date(new Date(start).getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - rangeMs);
    const prevEndStr = toYMD(prevEnd);
    const prevStartStr = toYMD(prevStart);

    const prevAnalytics = await batch(DUDA_SITES, 10, async (site) => {
      const stats = await fetchAnalytics(site.siteId, prevStartStr, prevEndStr, authHeader);
      return {
        siteId: site.siteId,
        visitors: stats?.VISITORS ?? 0,
        visits: stats?.VISITS ?? 0,
        pageViews: stats?.PAGE_VIEWS ?? 0,
      };
    });

    interface SiteAnalytics { siteId: string; name: string; url: string; visitors: number; visits: number; pageViews: number; }
    interface PrevAnalytics { siteId: string; visitors: number; visits: number; pageViews: number; }

    const typedAnalytics = analytics as SiteAnalytics[];
    const typedPrev = prevAnalytics as PrevAnalytics[];
    const prevMap = new Map(typedPrev.map((p) => [p.siteId, p]));

    const enriched = typedAnalytics.map((a) => {
      const p = prevMap.get(a.siteId);
      return {
        ...a,
        prevVisitors: p?.visitors ?? 0,
        prevVisits: p?.visits ?? 0,
        prevPageViews: p?.pageViews ?? 0,
        visitorsDelta: a.visitors - (p?.visitors ?? 0),
      };
    });

    // Totals
    const totals = enriched.reduce((acc, s) => ({
      visitors: acc.visitors + s.visitors,
      visits: acc.visits + s.visits,
      pageViews: acc.pageViews + s.pageViews,
      prevVisitors: acc.prevVisitors + s.prevVisitors,
      prevVisits: acc.prevVisits + s.prevVisits,
      prevPageViews: acc.prevPageViews + s.prevPageViews,
    }), { visitors: 0, visits: 0, pageViews: 0, prevVisitors: 0, prevVisits: 0, prevPageViews: 0 });

    return NextResponse.json({
      sites: enriched.sort((a, b) => b.visitors - a.visitors),
      totals,
      dateRange: { start, end, prevStart: prevStartStr, prevEnd: prevEndStr },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
