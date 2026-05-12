import { db } from "./db";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXTAUTH_URL
  ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
  : "https://neo-marketing-hub-dnov.vercel.app/api/auth/google/callback";

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

export async function getGscDashboardStats() {
  try {
    // Find any stored Google token
    const token = await db.googleToken.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!token) return null;

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken ?? undefined,
      expiry_date: token.expiresAt ? token.expiresAt.getTime() : undefined,
    });

    // Auto-refresh if expired
    if (token.expiresAt && token.expiresAt.getTime() < Date.now() + 60000) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await db.googleToken.update({
          where: { id: token.id },
          data: {
            accessToken: credentials.access_token ?? token.accessToken,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : token.expiresAt,
          },
        });
      } catch { return null; }
    }

    const sc = google.searchconsole({ version: "v1", auth: oauth2Client });

    // Get site list to find the primary site
    const sitesRes = await sc.sites.list();
    const sites = sitesRes.data.siteEntry ?? [];
    if (sites.length === 0) return null;

    // Pick the first verified site (prefer sc-domain: or https: entries)
    const primarySite =
      sites.find((s) => s.siteUrl?.startsWith("sc-domain:")) ??
      sites.find((s) => s.siteUrl?.startsWith("https:")) ??
      sites[0];

    if (!primarySite?.siteUrl) return null;
    const siteUrl = primarySite.siteUrl;

    const now = new Date();
    const end = toYMD(new Date(now.getTime() - 2 * 86400000)); // GSC is 2-3 days delayed
    const start28 = toYMD(new Date(now.getTime() - 30 * 86400000));
    const prevEnd = toYMD(new Date(now.getTime() - 31 * 86400000));
    const prevStart = toYMD(new Date(now.getTime() - 59 * 86400000));

    const [currentRes, prevRes] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: start28,
          endDate: end,
          dimensions: [],
          rowLimit: 1,
        },
      }),
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: prevStart,
          endDate: prevEnd,
          dimensions: [],
          rowLimit: 1,
        },
      }),
    ]);

    const cur = currentRes.data.rows?.[0] ?? null;
    const prev = prevRes.data.rows?.[0] ?? null;

    return {
      clicks: Math.round(cur?.clicks ?? 0),
      impressions: Math.round(cur?.impressions ?? 0),
      ctr: cur?.ctr ? Math.round(cur.ctr * 1000) / 10 : 0, // percentage
      position: cur?.position ? Math.round(cur.position * 10) / 10 : 0,
      prevClicks: Math.round(prev?.clicks ?? 0),
      prevImpressions: Math.round(prev?.impressions ?? 0),
      clicksDelta: prev?.clicks && prev.clicks > 0
        ? Math.round(((( cur?.clicks ?? 0) - prev.clicks) / prev.clicks) * 100)
        : null,
      siteUrl,
    };
  } catch {
    return null;
  }
}
