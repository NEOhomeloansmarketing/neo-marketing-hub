import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import Anthropic from "@anthropic-ai/sdk";

// Best-effort JSON repair — same approach used in visibility-audit
function repairJson(raw: string): string {
  let s = raw;
  s = s.replace(/\/\/[^\n]*/g, "");           // strip // comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");     // strip /* */ comments
  s = s.replace(/,(\s*[}\]])/g, "$1");         // remove trailing commas
  s = s.replace(/—/g, "-");                    // em-dash → hyphen
  s = s.replace(/\t/g, "\\t");                 // literal tabs
  // Remove unescaped newlines inside string values
  s = s.replace(/"([^"\\]*)(?:\n)([^"\\]*)"/g, '"$1 $2"');
  return s;
}

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

Return ONLY raw JSON — no markdown, no code fences, no explanation. Exact shape:
{
  "summary": "2-4 sentence summary of what was discussed and decided",
  "actionItems": [
    {
      "title": "Clear, specific action item starting with a verb",
      "ownerName": "Full name from attendees list, or null if unclear",
      "priority": "HIGH",
      "dueDate": "YYYY-MM-DD or null",
      "notes": "Brief context or null",
      "reasoning": "Why this is an action item (1 sentence)"
    }
  ]
}

Rules:
- Only include real, concrete action items (tasks someone must do)
- ownerName must exactly match one of the attendee names listed, or be null
- priority must be exactly "HIGH", "MEDIUM", or "LOW"
- dueDate only if a specific date or timeframe was mentioned, else null
- Maximum 15 action items; prioritize the most important
- No trailing commas anywhere in the JSON
- All string values must be on a single line — no newlines inside strings`;

    // Prefill "{" to force pure JSON output (same technique as visibility-audit)
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: [{ type: "text", text: "{" }] },
      ],
    });

    const continuation = message.content[0].type === "text" ? message.content[0].text : "";
    let jsonStr = ("{" + continuation).trim();

    // Strip accidental markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    jsonStr = repairJson(jsonStr);

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
      result = JSON.parse(jsonStr);
    } catch (err) {
      const pos = (err as SyntaxError).message.match(/position (\d+)/)?.[1];
      const at = pos ? Number(pos) : jsonStr.length;
      console.error(
        "[transcribe] JSON parse failed:", (err as SyntaxError).message,
        "\n--- context ---\n",
        jsonStr.slice(Math.max(0, at - 120), at + 120),
        "\n--- end ---"
      );
      return NextResponse.json({ error: "AI returned invalid JSON", raw: jsonStr.slice(0, 500) }, { status: 500 });
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
