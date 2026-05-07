import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { RequestsView } from "@/components/requests/RequestsView";

export default async function RequestsPage() {
  const user = await getApiUser();
  if (!user) return null;
  await getOrCreateDbUser(user);

  let requests: React.ComponentProps<typeof RequestsView>["requests"] = [];
  let teamMembers: React.ComponentProps<typeof RequestsView>["teamMembers"] = [];

  try {
    const raw = await db.marketingRequest.findMany({
      include: { assignee: { select: { id: true, name: true, color: true, initials: true } } },
      orderBy: { createdAt: "desc" },
    });
    requests = raw.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      dueDate: r.dueDate?.toISOString() ?? null,
    })) as React.ComponentProps<typeof RequestsView>["requests"];

    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, color: true, initials: true },
      orderBy: { name: "asc" },
    });
    teamMembers = users;
  } catch {
    // DB not ready
  }

  return <RequestsView requests={requests} teamMembers={teamMembers} />;
}
