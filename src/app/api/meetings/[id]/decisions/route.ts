import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { body: decisionBody } = body;
    if (!decisionBody) return NextResponse.json({ error: "body is required" }, { status: 400 });

    const decision = await db.meetingDecision.create({
      data: { meetingId: params.id, body: decisionBody, position: Date.now() },
    });
    return NextResponse.json(decision, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
