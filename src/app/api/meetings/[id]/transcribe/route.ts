import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 20) {
      return NextResponse.json({ error: "transcript is required (min 20 chars)" }, { status: 400 });
    }

    const meeting = await db.meeting.findUnique({
      where: { id: params.id },
      include: { attendees: { include: { user: true } } },
    });
    if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
    }

    const client = new Anthropic();
    const attendeeNames = meeting.attendees.map((a) => a.user.name).join(", ");

    const prompt = `You are analyzing a meeting transcript to extract action items and write a brief summary.

Meeting: "${meeting.title}"
Attendees: ${attendeeNames || "Unknown"}

Transcript:
${transcript.trim()}

Please respond with valid JSON only — no markdown, no code fences, just raw JSON in this exact shape:
{
  "summary": "2-4 sentence summary of what was discussed and decided",
  "actionItems": [
    {
      "title": "Clear, specific action item starting with a verb",
      "ownerName": "Full name from attendees list, or null if unclear",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "dueDate": "YYYY-MM-DD or null",
      "notes": "Optional brief context for this action item or null",
      "reasoning": "Why you identified this as an action item (1 sentence)"
    }
  ]
}

Rules:
- Only include real, concrete action items (tasks someone must do)
- ownerName must exactly match one of the attendee names listed, or be null
- dueDate should only be set if a specific date or timeframe was mentioned
- Limit to 15 action items maximum; prioritize the most important ones
- Do not include vague items like "follow up" without specifics`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    let result: {
      summary: string;
      actionItems: {
        title: string;
        ownerName: string | null;
        priority: string;
        dueDate: string | null;
        notes: string | null;
        reasoning: string;
      }[];
    };

    try {
      result = JSON.parse(text);
    } catch {
      // Try to extract JSON from response if it has extra text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        result = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ error: "AI returned invalid JSON", raw: text }, { status: 500 });
      }
    }

    // Attach attendee IDs to suggestions where ownerName matches
    const enriched = (result.actionItems ?? []).map((item) => {
      const matchedAttendee = meeting.attendees.find(
        (a) => item.ownerName && a.user.name.toLowerCase().includes(item.ownerName.toLowerCase())
      );
      return {
        ...item,
        ownerId: matchedAttendee?.user.id ?? null,
        ownerName: matchedAttendee?.user.name ?? item.ownerName,
      };
    });

    return NextResponse.json({
      summary: result.summary ?? "",
      actionItems: enriched,
      meetingId: meeting.id,
    });
  } catch (e) {
    console.error("Transcribe error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
