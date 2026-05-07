/**
 * Seed advisors from the Online Audit Excel file.
 * Run: npx ts-node --project tsconfig.json scripts/seed-advisors.ts
 * Or:  npx tsx scripts/seed-advisors.ts
 */
import * as XLSX from "xlsx";
import { PrismaClient, AdvisorPlatform } from "@prisma/client";
import * as path from "path";

const db = new PrismaClient();

const COLORS = [
  "#5bcbf5", "#6366f1", "#f59e0b", "#22c55e", "#f43f5e",
  "#a855f7", "#14b8a6", "#fb923c", "#64748b", "#ec4899",
];

function toStr(val: unknown): string {
  if (val == null || val === false) return "";
  if (typeof val === "boolean") return "";
  return String(val).trim();
}

function isLink(val: unknown): string | null {
  const s = toStr(val);
  if (!s || s === "N/A" || s === "DONE" || s === "NEEDS ATTENTION" || s === "LINK" || s === "PENDING") return null;
  if (s.startsWith("http")) return s.split("\n")[0].trim(); // take first URL if multiple
  if (s.includes(".")) return "https://" + s; // bare domain
  return null;
}

async function main() {
  const filePath = path.join(process.env.HOME || "~", "Downloads", "Online Audit (1).xlsx");
  console.log("Reading:", filePath);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["AUDIT"];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  // Row 1 is headers, data starts at row 2
  const dataRows = rows.slice(2).filter((r) => r.length > 1 && toStr(r[1]));

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const name = toStr(row[1]);
    if (!name) continue;

    const nmlsNumber = toStr(row[3]);
    const brand = toStr(row[2]) || undefined;
    const leader = toStr(row[4]) || undefined;
    const cityState = toStr(row[5]);
    const [city, state] = cityState.includes(",")
      ? [cityState.split(",")[0].trim(), cityState.split(",")[1].trim()]
      : [cityState, ""];

    const initials = name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
    const color = COLORS[i % COLORS.length];

    // Status flags
    const auditFormDone = row[7] === true;
    const matrixDone = row[8] === true;
    const canvaDone = row[9] === true;
    const hasSocialTool = toStr(row[10]) === "YES";

    // Build channels
    const channels: { platform: AdvisorPlatform; url: string; label?: string }[] = [];
    const addChannel = (platform: AdvisorPlatform, url: unknown) => {
      const u = isLink(url);
      if (u) channels.push({ platform, url: u });
    };

    addChannel(AdvisorPlatform.WEBSITE, row[11]);
    addChannel(AdvisorPlatform.GOOGLE_BUSINESS, row[14]);
    addChannel(AdvisorPlatform.LINKEDIN, row[16]);
    addChannel(AdvisorPlatform.FACEBOOK, row[20] ?? row[19]);
    addChannel(AdvisorPlatform.INSTAGRAM, row[22] ?? row[23]);
    addChannel(AdvisorPlatform.YOUTUBE, row[25]);
    addChannel(AdvisorPlatform.TIKTOK, row[27]);
    addChannel(AdvisorPlatform.ZILLOW, row[28]);
    addChannel(AdvisorPlatform.YELP, row[30]);

    try {
      // Upsert by NMLS if present, else by name
      const existing = nmlsNumber
        ? await db.advisor.findFirst({ where: { nmlsNumber } })
        : await db.advisor.findFirst({ where: { name } });

      if (existing) {
        skipped++;
        continue;
      }

      await db.advisor.create({
        data: {
          name,
          nmlsNumber,
          brand,
          leader,
          city,
          state,
          initials,
          color,
          status: "ACTIVE",
          auditFormUrl: auditFormDone ? "DONE" : null,
          matrixUrl: matrixDone ? "DONE" : null,
          canvaUrl: canvaDone ? "DONE" : null,
          socialToolUrl: hasSocialTool ? "YES" : null,
          channels: channels.length > 0 ? { create: channels } : undefined,
        },
      });
      created++;
      if (created % 10 === 0) console.log(`  ${created} advisors created…`);
    } catch (e) {
      console.error(`  Error on row ${i + 2} (${name}):`, e);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped (already exist): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
