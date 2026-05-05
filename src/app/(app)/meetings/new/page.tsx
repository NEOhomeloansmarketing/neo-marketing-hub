import { TopBar } from "@/components/topbar/TopBar";
import { MeetingNewForm } from "@/components/meetings/MeetingNewForm";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";

export default async function MeetingNewPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let teamMembers: Array<{
    id: string;
    name: string;
    color?: string;
    initials?: string;
  }> = [];
  let currentUserId = user?.id ?? "";

  try {
    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, color: true, initials: true },
      orderBy: { name: "asc" },
    });
    teamMembers = users;

    // Find by email since Supabase UID != Prisma ID
    if (user?.email) {
      const dbUser = await db.user.findUnique({ where: { email: user.email } });
      if (dbUser) currentUserId = dbUser.id;
    }
  } catch {
    // DB not ready
  }

  return (
    <>
      <TopBar title="New Meeting" subtitle="Schedule a meeting and set the agenda" />
      <div className="mt-6">
        <MeetingNewForm
          teamMembers={teamMembers}
          currentUserId={currentUserId}
        />
      </div>
    </>
  );
}
