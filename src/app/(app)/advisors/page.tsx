import { TopBar } from "@/components/topbar/TopBar";
import { AdvisorTable } from "@/components/advisors/AdvisorTable";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export default async function AdvisorsPage() {
  await requireAuth();

  let advisors: Parameters<typeof AdvisorTable>[0]["advisors"] = [];
  let leaders: string[] = [];

  try {
    const rawAdvisors = await db.advisor.findMany({
      include: {
        channels: true,
        issues: { where: { status: "OPEN" } },
      },
      orderBy: { name: "asc" },
    });

    advisors = rawAdvisors.map((a) => ({
      id: a.id,
      name: a.name,
      nmlsNumber: a.nmlsNumber,
      brand: a.brand,
      leader: a.leader,
      city: a.city,
      state: a.state,
      color: a.color,
      initials: a.initials,
      auditFormUrl: a.auditFormUrl,
      matrixUrl: a.matrixUrl,
      canvaUrl: a.canvaUrl,
      socialToolUrl: a.socialToolUrl,
      status: a.status,
      channels: a.channels.map((c) => ({
        id: c.id,
        platform: c.platform,
        url: c.url,
        label: c.label,
      })),
      openIssues: a.issues.length,
    }));

    leaders = Array.from(new Set(rawAdvisors.map((a) => a.leader).filter(Boolean) as string[])).sort();
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar
        title="Advisor Compliance"
        subtitle="Audit tracker for every advisor's public web & social presence"
        primaryAction="+ New advisor"
      />
      <div className="mt-6">
        <AdvisorTable advisors={advisors} leaders={leaders} />
      </div>
    </>
  );
}
