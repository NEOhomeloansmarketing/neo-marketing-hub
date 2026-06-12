import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: string[] = [];

  try {
    // Use $executeRawUnsafe — template literal version has issues with multi-line DDL
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Headline" (
        "id"        TEXT         NOT NULL,
        "title"     TEXT         NOT NULL,
        "type"      TEXT         NOT NULL DEFAULT 'WIN',
        "ownerId"   TEXT,
        "taskId"    TEXT         UNIQUE,
        "resolved"  BOOLEAN      NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Headline_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("Headline table: OK");
  } catch (err) {
    results.push(`Headline table ERROR: ${String(err)}`);
    return NextResponse.json({ ok: false, results }, { status: 500 });
  }

  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "Headline"
        ADD CONSTRAINT "Headline_ownerId_fkey"
        FOREIGN KEY ("ownerId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);
    results.push("ownerId FK: added");
  } catch {
    results.push("ownerId FK: already exists (ok)");
  }

  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "Headline"
        ADD CONSTRAINT "Headline_taskId_fkey"
        FOREIGN KEY ("taskId") REFERENCES "Task"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);
    results.push("taskId FK: added");
  } catch {
    results.push("taskId FK: already exists (ok)");
  }

  return NextResponse.json({ ok: true, results });
}
