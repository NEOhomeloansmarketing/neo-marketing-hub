/**
 * Sets isAdmin = true for Colin's account.
 * Run: npx tsx scripts/make-admin.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = "colin.jenson@neohomeloans.com";
  const user = await db.user.update({
    where: { email },
    data: { isAdmin: true },
  });
  console.log(`✓ Made ${user.name} (${user.email}) an admin.`);
}

main().catch(console.error).finally(() => db.$disconnect());
