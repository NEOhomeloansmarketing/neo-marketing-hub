import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiUser } from "@/lib/api-auth";
import { ACTIVE_TEAM_COOKIE } from "@/lib/team-context";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { teamId } = body;

  const store = await cookies();
  if (teamId) {
    store.set(ACTIVE_TEAM_COOKIE, teamId, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  } else {
    store.delete(ACTIVE_TEAM_COOKIE);
  }
  return NextResponse.json({ ok: true });
}
