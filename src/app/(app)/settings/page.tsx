import { redirect } from "next/navigation";
import { TopBar } from "@/components/topbar/TopBar";
import { SettingsView } from "@/components/settings/SettingsView";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";

export default async function SettingsPage() {
  const user = await getApiUser();
  if (!user) redirect("/sign-in");

  const dbUser = await getOrCreateDbUser(user);
  if (!dbUser) redirect("/sign-in");

  return (
    <>
      <TopBar title="Settings" subtitle="Manage your profile and account" />
      <div className="mt-6">
        <SettingsView user={{
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          initials: dbUser.initials,
          color: dbUser.color,
          role: dbUser.role,
        }} />
      </div>
    </>
  );
}
