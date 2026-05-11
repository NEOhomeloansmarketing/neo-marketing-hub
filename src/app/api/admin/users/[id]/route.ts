import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dbUser = await getOrCreateDbUser(user);
  if (!dbUser?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (dbUser.id === params.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  try {
    // Find the user's email to delete from Supabase Auth
    const target = await db.user.findUnique({ where: { id: params.id }, select: { email: true } });

    // Delete from DB first (cascades team memberships etc.)
    await db.user.delete({ where: { id: params.id } });

    // Delete from Supabase Auth using admin API
    if (target?.email) {
      const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u) => u.email === target.email);
      if (authUser) await supabaseAdmin.auth.admin.deleteUser(authUser.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dbUser = await getOrCreateDbUser(user);
  if (!dbUser?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const allowed = ["isAdmin", "isActive", "role"];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }
    const updated = await db.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, color: true, initials: true, role: true, isAdmin: true, isActive: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
