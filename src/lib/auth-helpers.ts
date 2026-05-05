import { createClient } from "./supabase-server";
import { redirect } from "next/navigation";

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
  return session;
}

export function isNeoEmail(email: string): boolean {
  return email.toLowerCase().endsWith("@neohomeloans.com");
}
