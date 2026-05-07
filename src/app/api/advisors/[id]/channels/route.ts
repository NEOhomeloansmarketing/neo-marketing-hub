import { NextResponse } from "next/server";
import { db, AdvisorPlatform } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

// Upsert a channel for an advisor — if url is empty string, deletes the existing channel
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { platform, url, label } = body as { platform: string; url: string; label?: string };

    if (!platform) return NextResponse.json({ error: "platform is required" }, { status: 400 });

    const existing = await db.advisorChannel.findFirst({
      where: { advisorId: params.id, platform: platform as AdvisorPlatform },
    });

    if (!url || !url.trim()) {
      // Delete if no URL
      if (existing) await db.advisorChannel.delete({ where: { id: existing.id } });
      return NextResponse.json({ deleted: true });
    }

    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;

    if (existing) {
      const ch = await db.advisorChannel.update({
        where: { id: existing.id },
        data: { url: cleanUrl, label: label ?? null },
      });
      return NextResponse.json(ch);
    } else {
      const ch = await db.advisorChannel.create({
        data: {
          advisorId: params.id,
          platform: platform as AdvisorPlatform,
          url: cleanUrl,
          label: label ?? null,
        },
      });
      return NextResponse.json(ch, { status: 201 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Add a custom/OTHER channel
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { platform, url, label } = body as { platform?: string; url: string; label?: string };
    if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

    const cleanUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const ch = await db.advisorChannel.create({
      data: {
        advisorId: params.id,
        platform: (platform as AdvisorPlatform) ?? AdvisorPlatform.OTHER,
        url: cleanUrl,
        label: label ?? null,
      },
    });
    return NextResponse.json(ch, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
