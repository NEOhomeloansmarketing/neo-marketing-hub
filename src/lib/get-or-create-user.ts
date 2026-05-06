import { db } from "./db";

interface SupabaseUser {
  email?: string;
  user_metadata?: Record<string, string>;
}

export async function getOrCreateDbUser(supabaseUser: SupabaseUser | null | undefined) {
  if (!supabaseUser?.email) return null;

  let dbUser = await db.user.findUnique({ where: { email: supabaseUser.email } });
  if (!dbUser) {
    const email = supabaseUser.email;
    const rawName =
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      email.split("@")[0].replace(/[._-]/g, " ");
    const name = rawName
      .split(" ")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    dbUser = await db.user.create({
      data: { email, name, initials, color: "#5bcbf5", role: "OTHER" },
    });
  }
  return dbUser;
}
