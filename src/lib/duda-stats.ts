import { DUDA_SITES } from "./duda-sites";

const BASE = "https://api.duda.co/api";

function auth() {
  const user = process.env.DUDA_API_USER;
  const key = process.env.DUDA_API_KEY;
  if (!user || !key) return null;
  return "Basic " + Buffer.from(`${user}:${key}`).toString("base64");
}

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

async function fetchOne(siteId: string, from: string, to: string, authHeader: string) {
  try {
    const res = await fetch(`${BASE}/analytics/site/${siteId}?from=${from}&to=${to}`, {
      headers: { Authorization: authHeader, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json() as { VISITORS: number; VISITS: number; PAGE_VIEWS: number };
  } catch { return null; }
}

export async function getDudaDashboardStats() {
  const authHeader = auth();
  if (!authHeader) return null;

  const now = new Date();
  const end = toYMD(now);
  const start30 = toYMD(new Date(now.getTime() - 30 * 86400000));
  const start7 = toYMD(new Date(now.getTime() - 7 * 86400000));
  const prev30Start = toYMD(new Date(now.getTime() - 60 * 86400000));
  const prev30End = toYMD(new Date(now.getTime() - 31 * 86400000));

  try {
    // Batch in chunks of 10
    const chunkSize = 10;
    let visitors30 = 0, visits30 = 0, pageViews30 = 0;
    let visitors7 = 0;
    let prevVisitors30 = 0;
    let activeSites = 0;

    for (let i = 0; i < DUDA_SITES.length; i += chunkSize) {
      const chunk = DUDA_SITES.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map((s) => Promise.all([
          fetchOne(s.siteId, start30, end, authHeader),
          fetchOne(s.siteId, start7, end, authHeader),
          fetchOne(s.siteId, prev30Start, prev30End, authHeader),
        ]))
      );
      for (const [r30, r7, rPrev] of results) {
        visitors30 += r30?.VISITORS ?? 0;
        visits30 += r30?.VISITS ?? 0;
        pageViews30 += r30?.PAGE_VIEWS ?? 0;
        visitors7 += r7?.VISITORS ?? 0;
        prevVisitors30 += rPrev?.VISITORS ?? 0;
        if ((r30?.VISITORS ?? 0) > 0) activeSites++;
      }
    }

    return {
      visitors30,
      visits30,
      pageViews30,
      visitors7,
      prevVisitors30,
      activeSites,
      totalSites: DUDA_SITES.length,
      visitorsDelta: prevVisitors30 > 0 ? Math.round(((visitors30 - prevVisitors30) / prevVisitors30) * 100) : null,
    };
  } catch { return null; }
}
