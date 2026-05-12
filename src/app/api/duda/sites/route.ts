import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { DUDA_SITES } from "@/lib/duda-sites";

// GET — list all stored sites (seeds from hardcoded list if DB is empty)
export async function GET() {
  try {
    await requireAuth();

    let sites = await db.dudaSite.findMany({ orderBy: { name: "asc" } });

    // First-run seed: populate DB from hardcoded list
    if (sites.length === 0 && DUDA_SITES.length > 0) {
      await db.dudaSite.createMany({
        data: DUDA_SITES.map((s) => ({
          siteId: s.siteId,
          name: s.name,
          url: s.url,
          isManual: false,
        })),
        skipDuplicates: true,
      });
      sites = await db.dudaSite.findMany({ orderBy: { name: "asc" } });
    }

    return NextResponse.json({ sites, total: sites.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — manually add a site
export async function POST(request: Request) {
  try {
    await requireAuth();
    const { siteId, name, url } = await request.json();

    if (!siteId || !name) {
      return NextResponse.json({ error: "siteId and name are required" }, { status: 400 });
    }

    const site = await db.dudaSite.upsert({
      where: { siteId },
      create: { siteId, name: name.trim(), url: url?.trim() ?? "", isManual: true },
      update: { name: name.trim(), url: url?.trim() ?? "" },
    });

    return NextResponse.json({ site });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
