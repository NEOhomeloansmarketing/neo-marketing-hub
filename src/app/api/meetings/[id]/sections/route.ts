import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { heading, bodyMd, position } = body;
    const section = await db.meetingSection.create({
      data: {
        meetingId: params.id,
        heading: heading ?? "New agenda item",
        bodyMd: bodyMd ?? "",
        position: position ?? 999,
      },
    });
    return NextResponse.json(section, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
