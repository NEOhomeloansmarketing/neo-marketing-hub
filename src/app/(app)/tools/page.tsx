import { TopBar } from "@/components/topbar/TopBar";
import { ToolsGrid } from "@/components/tools/ToolsGrid";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export default async function ToolsPage() {
  await requireAuth();

  let tools: Parameters<typeof ToolsGrid>[0]["tools"] = [];
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
      vaultLink: t.vaultLink,
      mfaMethod: t.mfaMethod,
      owner: t.owner
        ? {
            id: t.owner.id,
            name: t.owner.name,
            color: t.owner.color,
            initials: t.owner.initials,
            role: t.owner.role,
          }
        : null,
    }));

    const categorySet = new Set<string>();
    for (const t of rawTools) { if (t.category) categorySet.add(t.category); }
    categories = Array.from(categorySet).sort();
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar
        title="Tools & Logins"
        subtitle="Shared registry of every SaaS tool the team uses"
        primaryAction="+ Add tool"
      />
      <div className="mt-6">
        <ToolsGrid tools={tools} categories={categories} />
      </div>
    </>
  );
}
