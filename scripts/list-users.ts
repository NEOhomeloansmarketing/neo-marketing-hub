import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const users = await db.user.findMany({ select: { id: true, email: true, name: true, isAdmin: true } });
  console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => db.$disconnect());
