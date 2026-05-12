import { NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/lib/db";

async function getAuthClient() {
  const token = await db.googleToken.findFirst();
  if (!token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await db.googleToken.update({
        where: { id: token.id },
        data: { accessToken: tokens.access_token, expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600000) },
      });
    }
  });
  return oauth2Client;
}

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

const BRANDED_TERMS = ["neo", "neo home", "neo home loans", "neohomeloans", "neo loans", "neo mortgage"];

function isBranded(query: string) {
  const q = query.toLowerCase();
  return BRANDED_TERMS.some((t) => q.includes(t));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteUrl = searchParams.get("site");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  try {
    const auth = await getAuthClient();
    if (!auth) return NextResponse.json({ connected: false });
    const sc = google.webmasters({ version: "v3", auth });

    if (!siteUrl) {
      const { data } = await sc.sites.list();
      return NextResponse.json({ connected: true, sites: data.siteEntry ?? [] });
    }

    const endDate = endParam ? new Date(endParam) : new Date();
    const startDate = startParam ? new Date(startParam) : (() => { const d = new Date(); d.setDate(d.getDate() - 28); return d; })();
    const rangeMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - rangeMs);

    const start = toYMD(startDate);
    const end = toYMD(endDate);
    const pStart = toYMD(prevStart);
    const pEnd = toYMD(prevEnd);

    const query = (dims: string[], rowLimit = 25, dateStart = start, dateEnd = end) =>
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: dateStart, endDate: dateEnd, dimensions: dims.length ? dims : undefined, rowLimit } });

    // Fire all requests in parallel
    const [
      overviewRes, prevOverviewRes,
      queriesRes, prevQueriesRes,
      pagesRes, dailyRes,
      deviceRes, countryRes, searchTypeRes,
    ] = await Promise.all([
      query([], 1),
      query([], 1, pStart, pEnd),
      query(["query"], 50),
      query(["query"], 50, pStart, pEnd),
      query(["page"], 15),
      query(["date"], 500),
      query(["device"], 10),
      query(["country"], 15),
      query(["searchAppearance"], 10),
    ]);

    // --- Branded vs unbranded ---
    const allQueries = queriesRes.data.rows ?? [];
    let brandedClicks = 0, brandedImpressions = 0;
    let unbrandedClicks = 0, unbrandedImpressions = 0;
    for (const r of allQueries) {
      const q = r.keys?.[0] ?? "";
      if (isBranded(q)) { brandedClicks += r.clicks ?? 0; brandedImpressions += r.impressions ?? 0; }
      else { unbrandedClicks += r.clicks ?? 0; unbrandedImpressions += r.impressions ?? 0; }
    }

    // --- Opportunity keywords (pos 4–15, decent impressions) ---
    const opportunityKeywords = allQueries
      .filter((r) => (r.position ?? 0) >= 4 && (r.position ?? 0) <= 15 && (r.impressions ?? 0) >= 10)
      .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
      .slice(0, 15);

    // --- Losing queries (biggest position drop vs prev period) ---
    const prevQueriesMap = new Map<string, number>();
    for (const r of prevQueriesRes.data.rows ?? []) {
      prevQueriesMap.set(r.keys?.[0] ?? "", r.position ?? 0);
    }
    const losingQueries = allQueries
      .filter((r) => {
        const q = r.keys?.[0] ?? "";
        const prevPos = prevQueriesMap.get(q);
        return prevPos !== undefined && (r.position ?? 0) > prevPos + 0.5;
      })
      .map((r) => ({
        ...r,
        prevPosition: prevQueriesMap.get(r.keys?.[0] ?? "") ?? 0,
        positionDelta: (r.position ?? 0) - (prevQueriesMap.get(r.keys?.[0] ?? "") ?? 0),
      }))
      .sort((a, b) => b.positionDelta - a.positionDelta)
      .slice(0, 10);

    // --- Gaining queries (biggest position improvement) ---
    const gainingQueries = allQueries
      .filter((r) => {
        const q = r.keys?.[0] ?? "";
        const prevPos = prevQueriesMap.get(q);
        return prevPos !== undefined && (r.position ?? 0) < prevPos - 0.5;
      })
      .map((r) => ({
        ...r,
        prevPosition: prevQueriesMap.get(r.keys?.[0] ?? "") ?? 0,
        positionDelta: (r.position ?? 0) - (prevQueriesMap.get(r.keys?.[0] ?? "") ?? 0),
      }))
      .sort((a, b) => a.positionDelta - b.positionDelta)
      .slice(0, 10);

    // --- Daily → weekly aggregation ---
    const dailyRows = dailyRes.data.rows ?? [];
    const weekMap = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; days: number }>();
    for (const row of dailyRows) {
      const d = new Date(row.keys![0]);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = toYMD(monday);
      const ex = weekMap.get(key) ?? { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, days: 0 };
      ex.clicks += row.clicks ?? 0; ex.impressions += row.impressions ?? 0;
      ex.ctrSum += row.ctr ?? 0; ex.posSum += row.position ?? 0; ex.days += 1;
      weekMap.set(key, ex);
    }
    const weekly = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, v]) => ({
        weekStart, clicks: v.clicks, impressions: v.impressions,
        ctr: v.days > 0 ? v.ctrSum / v.days : 0,
        position: v.days > 0 ? v.posSum / v.days : 0,
      }));

    return NextResponse.json({
      connected: true,
      overview: overviewRes.data.rows?.[0] ?? null,
      prevOverview: prevOverviewRes.data.rows?.[0] ?? null,
      queries: allQueries.slice(0, 15),
      pages: pagesRes.data.rows ?? [],
      daily: dailyRows,
      weekly,
      devices: deviceRes.data.rows ?? [],
      countries: countryRes.data.rows ?? [],
      searchTypes: searchTypeRes.data.rows ?? [],
      branded: { clicks: brandedClicks, impressions: brandedImpressions },
      unbranded: { clicks: unbrandedClicks, impressions: unbrandedImpressions },
      opportunityKeywords,
      losingQueries,
      gainingQueries,
      dateRange: { start, end, pStart, pEnd },
    });
  } catch (e) {
    console.error("Search Console error:", e);
    return NextResponse.json({ connected: false, error: String(e) });
  }
}
