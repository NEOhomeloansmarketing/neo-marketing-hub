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

  // Auto-refresh and persist new token if expired
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteUrl = searchParams.get("site");

  try {
    const auth = await getAuthClient();
    if (!auth) return NextResponse.json({ connected: false });

    const sc = google.webmasters({ version: "v3", auth });

    // Get list of sites if no site specified
    if (!siteUrl) {
      const { data } = await sc.sites.list();
      return NextResponse.json({ connected: true, sites: data.siteEntry ?? [] });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);
    const start = startDate.toISOString().split("T")[0];
    const end = endDate.toISOString().split("T")[0];

    const [overviewRes, queriesRes, pagesRes, dailyRes] = await Promise.all([
      // Overall totals
      sc.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: start, endDate: end, dimensions: [] },
      }),
      // Top queries
      sc.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: start, endDate: end, dimensions: ["query"], rowLimit: 10 },
      }),
      // Top pages
      sc.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: start, endDate: end, dimensions: ["page"], rowLimit: 10 },
      }),
      // Daily trend (last 28 days)
      sc.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: start, endDate: end, dimensions: ["date"], rowLimit: 28 },
      }),
    ]);

    return NextResponse.json({
      connected: true,
      overview: overviewRes.data.rows?.[0] ?? null,
      queries: queriesRes.data.rows ?? [],
      pages: pagesRes.data.rows ?? [],
      daily: dailyRes.data.rows ?? [],
    });
  } catch (e) {
    console.error("Search Console error:", e);
    return NextResponse.json({ connected: false, error: String(e) });
  }
}
