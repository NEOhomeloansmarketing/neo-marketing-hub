import { AdvisorsPageShell } from "@/components/advisors/AdvisorsPageShell";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getActiveTeamId } from "@/lib/team-context";

export default async function AdvisorsPage() {
  const user = await getApiUser();
  if (!user) return null;

  const activeTeamId = await getActiveTeamId();

  let advisors: any[] = [];
  let leaders: string[] = [];

  try {
    const rawAdvisors = await db.advisor.findMany({
      where: activeTeamId ? { OR: [{ teamId: activeTeamId }, { teamId: null }] } : undefined,
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
      email: a.email,
      phone: a.phone,
      streetAddress: a.streetAddress,
      city: a.city,
      state: a.state,
      zip: a.zip,
      region: a.region,
      licenseStates: a.licenseStates,
      nextAuditDue: a.nextAuditDue?.toISOString() ?? null,
      photoUrl: a.photoUrl,
      color: a.color,
      initials: a.initials,
      auditFormUrl: a.auditFormUrl,
      matrixUrl: a.matrixUrl,
      canvaUrl: a.canvaUrl,
      socialToolUrl: a.socialToolUrl,
      napFormUrl: a.napFormUrl,
      napNotes: a.napNotes,
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
