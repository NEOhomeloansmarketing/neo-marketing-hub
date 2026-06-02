import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getApiUser } from "@/lib/api-auth";

/**
 * GET /api/setup
 * Creates any missing tables that can't be applied via local prisma db push.
 * Safe to call repeatedly — uses IF NOT EXISTS.
 */
export async function GET() {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: string[] = [];

  try {
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Headline" (
        "id"        TEXT        NOT NULL,
        "title"     TEXT        NOT NULL,
        "type"      TEXT        NOT NULL DEFAULT 'WIN',
        "ownerId"   TEXT,
        "taskId"    TEXT        UNIQUE,
        "resolved"  BOOLEAN     NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Headline_pkey" PRIMARY KEY ("id")
      )
    `;
    results.push("Headline table: OK");

    // Add foreign keys if they don't already exist (wrapped individually so one
    // failure doesn't stop the rest)
    try {
      await db.$executeRaw`
        ALTER TABLE "Headline"
          ADD CONSTRAINT "Headline_ownerId_fkey"
          FOREIGN KEY ("ownerId") REFERENCES "User"("id")
          ON DELETE SET NULL ON UPDATE CASCADE
      `;
      results.push("Headline.ownerId FK: added");
    } catch {
      results.push("Headline.ownerId FK: already exists");
    }

    try {
      await db.$executeRaw`
        ALTER TABLE "Headline"
          ADD CONSTRAINT "Headline_taskId_fkey"
          FOREIGN KEY ("taskId") REFERENCES "Task"("id")
          ON DELETE SET NULL ON UPDATE CASCADE
      `;
      results.push("Headline.taskId FK: added");
    } catch {
      results.push("Headline.taskId FK: already exists");
    }
  } catch (err) {
    return NextResponse.json({ error: String(err), results }, { status: 500 });
  }

  return NextResponse.json({ ok: true, results });
}
