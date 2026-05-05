import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { db } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Try to get user profile from DB; fall back to Supabase metadata
  let profile = null;
  try {
    profile = await db.user.findUnique({ where: { email: user.email! } });
  } catch {
    // DB not yet connected — fall back gracefully
  }

  const meta = user.user_metadata;
  const displayUser = profile
    ? {
        name: profile.name,
        email: profile.email,
        role: profile.role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        color: profile.color,
        initials: profile.initials,
      }
    : {
        name: meta?.name ?? user.email?.split("@")[0] ?? "Team Member",
        email: user.email ?? "",
        role: meta?.role ?? "Member",
        color: meta?.color ?? "#5bcbf5",
        initials: (meta?.name ?? user.email ?? "?")
          .split(" ")
          .map((p: string) => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      };

  return (
    <div className="min-h-screen" style={{ background: "#061320" }}>
      <Sidebar user={displayUser} />
      <div
        className="flex min-h-screen flex-col"
        style={{ marginLeft: 220 }}
      >
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
