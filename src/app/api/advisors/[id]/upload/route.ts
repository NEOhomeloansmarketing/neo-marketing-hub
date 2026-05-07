import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const BUCKET = "advisor-files";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const supabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${params.id}/nap-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await db.advisor.update({
      where: { id: params.id },
      data: { napFormUrl: publicUrl },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error("Advisor upload error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
