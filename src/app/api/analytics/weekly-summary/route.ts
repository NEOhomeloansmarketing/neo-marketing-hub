import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getActiveTeamId } from "@/lib/team-context";
import Anthropic from "@anthropic-ai/sdk";

function getWeekStart(d: Date): Date {
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const ws = new Date(d);
  ws.setDate(ws.getDate() + diff);
  ws.setHours(0, 0, 0, 0);
  return ws;
}

// GET — return the cached summary for the current week (or null)
export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const weekStart = getWeekStart(new Date());
    const teamId = await getActiveTeamId();

    const summary = await db.weeklySummary.findFirst({
      where: {
        weekStart,
        ...(teamId ? { teamId } : {}),
      },
      orderBy: { generatedAt: "desc" },
    });

    return NextResponse.json(summary ?? null);
  } catch (e) {
    console.error("GET weekly-summary:", e);
    return NextResponse.json(null);
  }
}

// POST — (re)generate and cache the summary for the current week
export async function POST() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  try {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const teamId = await getActiveTeamId();

    // Gather all tasks for context
    const allTasks = await db.task.findMany({
      where: teamId ? { teamId } : undefined,
      include: { owner: true },
    });

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const completedThisWeek = allTasks.filter(
      (t) => t.status === "DONE" && t.updatedAt >= weekStart && t.updatedAt <= now
    );
    const openTasks = allTasks.filter((t) => t.status !== "DONE");
    const overdueTasks = openTasks.filter((t) =>
      t.dueDate ? t.dueDate < startOfToday : t.dueBucket === "yesterday"
    );
    const highPriDone = completedThisWeek.filter((t) => t.priority === "HIGH");

    // Group completed by person
    const byPerson = new Map<string, { name: string; tasks: typeof completedThisWeek }>();
    for (const t of completedThisWeek) {
      if (!byPerson.has(t.ownerId)) byPerson.set(t.ownerId, { name: t.owner.name, tasks: [] });
      byPerson.get(t.ownerId)!.tasks.push(t);
    }

    const personSummaries = Array.from(byPerson.values())
      .sort((a, b) => b.tasks.length - a.tasks.length)
      .map((p) => `${p.name} (${p.tasks.length} task${p.tasks.length !== 1 ? "s" : ""}): ${p.tasks.map((t) => `"${t.title}"`).join(", ")}`)
      .join("\n");

    const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    const prompt = `You are writing the weekly team accomplishments summary for a mortgage marketing operations team at NEO Home Loans.

Week: ${weekLabel}
Tasks completed this week: ${completedThisWeek.length}
High-priority tasks completed: ${highPriDone.length}
Total open tasks remaining: ${openTasks.length}
Overdue tasks: ${overdueTasks.length}

Who completed what:
${personSummaries || "No tasks completed this week yet."}

High-priority completions:
${highPriDone.map((t) => `- "${t.title}" by ${t.owner.name}`).join("\n") || "None"}

Write a professional, warm, and motivating weekly summary for the team. Structure it as:
1. A 2-3 sentence opening paragraph celebrating the week's output with specific numbers and names
2. A second paragraph noting any standout contributions or high-priority wins
3. If there are overdue tasks, a brief, non-judgmental closing sentence acknowledging what still needs attention next week

Then provide exactly 3-5 bullet point highlights (each starting with an emoji that fits the theme, e.g. ✅ 🏆 🔥 📈 ⚡).

Return ONLY valid JSON in this exact shape — no markdown, no code fences:
{"prose":"full paragraphs here (use \\n\\n between paragraphs)","highlights":["✅ highlight one","🏆 highlight two","🔥 highlight three"]}`;

    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    let jsonStr = raw;
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    else {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e > s) jsonStr = raw.slice(s, e + 1);
    }

    // Repair common issues
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1").replace(/[—–]/g, "-").replace(/[""]/g, '"');

    const parsed = JSON.parse(jsonStr) as { prose: string; highlights: string[] };

    // Upsert: delete any existing summary for this week, then create fresh
    await db.weeklySummary.deleteMany({
      where: { weekStart, ...(teamId ? { teamId } : {}) },
    });
    const saved = await db.weeklySummary.create({
      data: {
        weekStart,
        prose: parsed.prose,
        highlights: parsed.highlights,
        teamId: teamId ?? null,
      },
    });

    return NextResponse.json(saved);
  } catch (e) {
    console.error("POST weekly-summary:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
