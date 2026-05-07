import { TopBar } from "@/components/topbar/TopBar";
import { IdeasView } from "@/components/ideas/IdeasView";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { getActiveTeamId } from "@/lib/team-context";

export default async function IdeasPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let ideas: Parameters<typeof IdeasView>[0]["ideas"] = [];
  let currentUserId = "";

  try {
    let dbUser = null;
    if (user?.email) {
      dbUser = await db.user.findUnique({ where: { email: user.email } });
    }
    currentUserId = dbUser?.id ?? "";

    const activeTeamId = await getActiveTeamId();
    const rawIdeas = await db.idea.findMany({
      where: {
        status: { not: "ARCHIVED" },
        ...(activeTeamId ? { teamId: activeTeamId } : {}),
      },
      include: {
        author: true,
        votes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    ideas = rawIdeas.map((i) => ({
      id: i.id,
      title: i.title,
      body: i.body,
      authorId: i.authorId,
      authorName: i.author.name,
      authorColor: i.author.color,
      authorInitials: i.author.initials,
      tags: i.tags,
      status: i.status,
      votes: i.votes.length,
      votedByCurrentUser: i.votes.some((v) => v.userId === currentUserId),
      commentCount: 0,
      createdAt: i.createdAt.toISOString(),
    }));
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar
        title="Idea Board"
        subtitle="Capture, vote, and ship the team's best ideas"
        primaryAction="+ New idea"
      />
      <div className="mt-6">
        <IdeasView ideas={ideas} currentUserId={currentUserId} />
      </div>
    </>
  );
}
