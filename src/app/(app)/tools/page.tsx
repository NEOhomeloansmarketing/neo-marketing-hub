import { ToolsPageShell } from "@/components/tools/ToolsPageShell";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export default async function ToolsPage() {
  const user = await getApiUser();
  if (!user) return null;

  let tools: React.ComponentProps<typeof ToolsPageShell>["tools"] = [];
  let categories: string[] = [];

  try {
    const rawTools = await db.tool.findMany({
      include: { owner: true },
      orderBy: { name: "asc" },
    });

    tools = rawTools.map((t) => ({
      id: t.id,
      name: t.name,
      url: t.url,
      category: t.category,
      glyph: t.glyph,
      color: t.color,
      seats: t.seats,
      lastAccessed: t.lastAccessed,
      notesMd: t.notesMd,
      credKind: t.credKind,
      username: t.username,
      credPassword: t.credPassword,
      vaultLink: t.vaultLink,
      mfaMethod: t.mfaMethod,
      owner: t.owner
        ? { id: t.owner.id, name: t.owner.name, color: t.owner.color, initials: t.owner.initials, role: t.owner.role }
        : null,
    }));

    const categorySet = new Set<string>();
    for (const t of rawTools) { if (t.category) categorySet.add(t.category); }
    categories = Array.from(categorySet).sort();
  } catch {
    // DB not ready
  }

  return <ToolsPageShell tools={tools} categories={categories} />;
}
