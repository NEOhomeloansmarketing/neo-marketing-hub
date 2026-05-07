import { AdvisorsPageShell } from "@/components/advisors/AdvisorsPageShell";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export default async function AdvisorsPage() {
  const user = await getApiUser();
  if (!user) return null;

  let advisors: any[] = [];
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

  return <AdvisorsPageShell advisors={advisors} leaders={leaders} />;
}
