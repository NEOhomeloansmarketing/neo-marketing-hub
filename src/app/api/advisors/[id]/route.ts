import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const advisor = await db.advisor.findUnique({
      where: { id: params.id },
      include: { channels: true, issues: true, audits: { include: { checks: true } } },
    });
    if (!advisor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(advisor);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const ALLOWED = [
      "name", "nmlsNumber", "brand", "leader", "email", "phone",
      "streetAddress", "city", "state", "zip", "region", "status",
      "nextAuditDue", "photoUrl", "napFormUrl", "napNotes",
      "auditFormUrl", "matrixUrl", "canvaUrl", "socialToolUrl",
    ];
    const data: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (key in body) data[key] = body[key];
    }
    // licenseStates comes as a comma-separated string from the client
    if ("licenseStates" in body) {
      const raw = body.licenseStates as string;
      data.licenseStates = typeof raw === "string"
        ? raw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(raw) ? raw : [];
    }
    if ("nextAuditDue" in body && body.nextAuditDue) {
      data.nextAuditDue = new Date(body.nextAuditDue);
    }
    const advisor = await db.advisor.update({
      where: { id: params.id },
      data,
      include: { channels: true },
    });
    return NextResponse.json(advisor);
  } catch (e) {
    console.error("Advisor PATCH error:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.advisor.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
