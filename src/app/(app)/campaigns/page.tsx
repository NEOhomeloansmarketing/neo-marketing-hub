import { TopBar } from "@/components/topbar/TopBar";
import { CampaignsView } from "@/components/campaigns/CampaignsView";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { getActiveTeamId } from "@/lib/team-context";

export default async function CampaignsPage() {
  await requireAuth();

  const teamId = await getActiveTeamId();
  const raw = await db.campaign.findMany({
    where: teamId ? { OR: [{ teamId }, { teamId: null }] } : undefined,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  const campaigns = raw.map((c) => ({
    ...c,
    launchedAt: c.launchedAt ? c.launchedAt.toISOString() : null,
  }));

  return (
    <>
      <TopBar title="Campaigns" subtitle="Monthly campaigns, assets, and launch status" />
      <div className="mt-6">
        <CampaignsView initialCampaigns={campaigns} />
      </div>
    </>
  );
}
