import { cookies } from "next/headers";

export const ACTIVE_TEAM_COOKIE = "neo-team-id";

export async function getActiveTeamId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_TEAM_COOKIE)?.value ?? null;
}
