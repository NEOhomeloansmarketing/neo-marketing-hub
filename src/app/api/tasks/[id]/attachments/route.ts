import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";
import { getOrCreateDbUser } from "@/lib/get-or-create-user";
import { createClient } from "@/lib/supabase-server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const attachments = await db.taskAttachment.findMany({
      where: { taskId: params.id },
      include: { uploadedBy: { select: { id: true, name: true, initials: true, color: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(attachments);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const dbUser = await getOrCreateDbUser(user);
    if (!dbUser) return NextResponse.json({ error: "Could not resolve user" }, { status: 400 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const supabase = await createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `tasks/${params.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage
      .from("task-attachments")
      .getPublicUrl(path);

    const attachment = await db.taskAttachment.create({
      data: {
        taskId: params.id,
        uploadedById: dbUser.id,
        name: file.name,
        url: publicUrl,
        size: file.size,
        mimeType: file.type || `application/octet-stream`,
      },
      include: { uploadedBy: { select: { id: true, name: true, initials: true, color: true } } },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { attachmentId } = await request.json();
    const attachment = await db.taskAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createClient();
    const urlPath = new URL(attachment.url).pathname;
    const storagePath = urlPath.split("/task-attachments/")[1];
    if (storagePath) {
      await supabase.storage.from("task-attachments").remove([storagePath]);
    }

    await db.taskAttachment.delete({ where: { id: attachmentId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
