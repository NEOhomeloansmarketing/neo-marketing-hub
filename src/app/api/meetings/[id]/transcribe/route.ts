import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import Anthropic from "@anthropic-ai/sdk";

// Best-effort JSON repair
function repairJson(raw: string): string {
  let s = raw;
  // Strip single-line and multi-line comments
  s = s.replace(/\/\/[^\n\r]*/g, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  // Replace em-dash / en-dash with hyphen
  s = s.replace(/[—–]/g, "-");
  // Replace smart quotes with straight quotes
  s = s.replace(/[""]/g, '"');
  s = s.replace(/['']/g, "'");
  // Remove trailing commas before ] or }
  s = s.replace(/,(\s*[}\]])/g, "$1");
  // Replace literal tab characters inside strings with \t
  s = s.replace(/\t/g, " ");
  // Remove unescaped newlines/carriage returns inside string values (multiple passes)
  for (let i = 0; i < 5; i++) {
    s = s.replace(/"((?:[^"\\]|\\.)*)[\r\n]+((?:[^"\\]|\\.)*)"/, '"$1 $2"');
  }
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

    const prompt = `Analyze this meeting transcript. Return ONLY a JSON object — no markdown, no code fences, no explanation, no preamble.

Meeting: "${meeting.title}"
Attendees: ${attendeeNames || "Unknown"}

Transcript:
${transcript.trim()}

Return this exact JSON structure:
{"summary":"string","actionItems":[{"title":"string","ownerName":"string or null","priority":"HIGH or MEDIUM or LOW","dueDate":"YYYY-MM-DD or null","notes":"string or null","reasoning":"string"}]}

Rules:
- summary: 2-4 sentences covering what was discussed and decided
- actionItems: only real concrete tasks (max 10)
- ownerName: must be one of the attendee names above, or null
- priority: exactly HIGH, MEDIUM, or LOW
- dueDate: only if a specific date was mentioned, otherwise null
- All string values on a single line, no line breaks inside strings
- No trailing commas`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const stopReason = message.stop_reason;
    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    if (stopReason === "max_tokens") {
      console.error("[transcribe] Response truncated — max_tokens hit. Raw length:", raw.length);
      return NextResponse.json({ error: "AI response was cut off — transcript may be too long. Try a shorter transcript." }, { status: 500 });
    }

    // Extract JSON from response
    let jsonStr: string;
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      jsonStr = start !== -1 && end > start ? raw.slice(start, end + 1) : raw;
    }

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
      const msg = (err as SyntaxError).message;
      const pos = msg.match(/position (\d+)/)?.[1];
      const at = pos ? Number(pos) : jsonStr.length;
      console.error(
        "[transcribe] JSON parse failed:", msg,
        "\n--- near failure ---\n",
        jsonStr.slice(Math.max(0, at - 200), at + 200),
        "\n--- full raw (first 1000) ---\n",
        raw.slice(0, 1000)
      );
      return NextResponse.json({
        error: "AI returned invalid JSON",
        detail: msg,
        raw: raw.slice(0, 2000),
      }, { status: 500 });
    }

    // Attach attendee IDs where ownerName matches an attendee
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
