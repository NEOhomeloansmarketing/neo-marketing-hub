import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const meeting = await db.meeting.findUnique({
      where: { id: params.id },
      include: { sections: true, attendees: { include: { user: true } } },
    });
    if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
    }

    const client = new Anthropic();
    const notesText = meeting.sections.map((s) => `## ${s.title}\n${s.body ?? ""}`).join("\n\n");
    const attendeeNames = meeting.attendees.map((a) => a.user.name).join(", ");

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are extracting action items from meeting notes. Return a JSON array of action items. Each item must have: title (string), assigneeName (string or null — must match one of the attendees), dueDate (ISO date string or null).

Meeting attendees: ${attendeeNames}

Meeting notes:
${notesText}

Return ONLY the JSON array, no other text.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    let extracted: { title: string; assigneeName: string | null; dueDate: string | null }[] = [];
    try {
      extracted = JSON.parse(text);
    } catch {
      extracted = [];
    }

    const created = await Promise.all(
      extracted.map(async (item) => {
        let assigneeId: string | undefined;
        if (item.assigneeName) {
          const user = await db.user.findFirst({ where: { name: { contains: item.assigneeName } } });
          assigneeId = user?.id;
        }
        return db.actionItem.create({
          data: {
            title: item.title,
            status: "OPEN",
            priority: "MEDIUM",
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            meetingId: meeting.id,
            assigneeId,
          },
        });
      })
    );

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
