import { createClient } from "./supabase-server";
import { redirect } from "next/navigation";
import { db } from "./db";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  // Check DB user is approved (isActive)
  if (session.user?.email) {
    const dbUser = await db.user.findUnique({ where: { email: session.user.email }, select: { isActive: true, isAdmin: true } });
    if (dbUser && !dbUser.isActive) redirect("/pending-approval");
  }

  return session;
}

export function isNeoEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@neohomeloans.com");
}
