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
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
        },
      });
    }
  });

  return oauth2Client;
}

function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
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
    const startDate = startParam ? new Date(startParam) : (() => {
      const d = new Date(); d.setDate(d.getDate() - 28); return d;
    })();

    const rangeMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - rangeMs);

    const start = toYMD(startDate);
    const end = toYMD(endDate);
    const pStart = toYMD(prevStart);
    const pEnd = toYMD(prevEnd);

    const [overviewRes, prevOverviewRes, queriesRes, pagesRes, dailyRes] = await Promise.all([
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: start, endDate: end, dimensions: [] } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: pStart, endDate: pEnd, dimensions: [] } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: start, endDate: end, dimensions: ["query"], rowLimit: 15 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: start, endDate: end, dimensions: ["page"], rowLimit: 15 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: start, endDate: end, dimensions: ["date"], rowLimit: 500 } }),
    ]);

    // Aggregate daily into weeks
    const dailyRows = dailyRes.data.rows ?? [];
    const weekMap = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; days: number }>();
    for (const row of dailyRows) {
      const d = new Date(row.keys![0]);
      // Week label = Monday of that week
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = toYMD(monday);
      const existing = weekMap.get(key) ?? { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, days: 0 };
      existing.clicks += row.clicks ?? 0;
      existing.impressions += row.impressions ?? 0;
      existing.ctrSum += row.ctr ?? 0;
      existing.posSum += row.position ?? 0;
      existing.days += 1;
      weekMap.set(key, existing);
    }
    const weekly = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, v]) => ({
        weekStart,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.days > 0 ? v.ctrSum / v.days : 0,
        position: v.days > 0 ? v.posSum / v.days : 0,
      }));

    return NextResponse.json({
      connected: true,
      overview: overviewRes.data.rows?.[0] ?? null,
      prevOverview: prevOverviewRes.data.rows?.[0] ?? null,
      queries: queriesRes.data.rows ?? [],
      pages: pagesRes.data.rows ?? [],
      daily: dailyRows,
      weekly,
      dateRange: { start, end },
    });
  } catch (e) {
    console.error("Search Console error:", e);
    return NextResponse.json({ connected: false, error: String(e) });
  }
}
