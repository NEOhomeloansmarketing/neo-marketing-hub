import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const tools = [
  {
    name: "Bitly",
    url: "https://bitly.com",
    category: "Marketing",
    username: "marketing@neohomeloans.com",
    credPassword: "NEOM4rketing2025!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "Google Search Console",
    url: "https://search.google.com/search-console",
    category: "Analytics",
    username: "marketing@neohomeloans.com",
    credPassword: "NE0M4rketing-2025!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com",
    category: "Social Media",
    username: "NEOHomeLoans",
    credPassword: "IGNEO2021",
  },
  {
    name: "Linktree",
    url: "https://linktr.ee",
    category: "Social Media",
    username: "NEOhomeloans",
    credPassword: "YESsir44#",
  },
  {
    name: "YouTube (NEO Corporate)",
    url: "https://studio.youtube.com",
    category: "Social Media",
    username: "neohomeloans1@gmail.com",
    credPassword: "Neohomeloans1!",
  },
  {
    name: "BusinessWire",
    url: "https://www.businesswire.com",
    category: "PR",
    username: "Maddi.hargrove@neohomeloans.com",
    credPassword: "NEOBusiness1234!",
    recoveryContact: "Maddi.hargrove@neohomeloans.com",
  },
  {
    name: "VistaPrint",
    url: "https://www.vistaprint.com",
    category: "Design",
    username: "marketing@neohomeloans.com",
    credPassword: "NEOmarketing12341234!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "ScoreApp",
    url: "https://scoreapp.com",
    category: "Marketing",
    username: "Bri.lees@neohomeloans.com",
    credPassword: "Marketing1234!",
    recoveryContact: "Bri.lees@neohomeloans.com",
  },
  {
    name: "Blended Sense",
    url: "https://blendedsense.com",
    category: "Creative",
    username: "marketing@neohomeloans.com",
    credPassword: "NEOsense2233!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "4imprint",
    url: "https://www.4imprint.com",
    category: "Marketing",
    username: "marketing@neohomeloans.com",
    credPassword: "NEOimprint3322!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "Gumloop",
    url: "https://gumloop.com",
    category: "Automation",
    username: "marketing@neohomeloans.com",
    credPassword: "LOOPthatGUM2323!!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "Typeform",
    url: "https://www.typeform.com",
    category: "Marketing",
    username: "marketing@neohomeloans.com",
    credPassword: "TYPEthatFORM2233!!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "Active Comply",
    url: "https://activecomply.com",
    category: "Compliance",
    username: "meghan.mcmichael@neohomeloans.com",
    credPassword: "Keukalake2018!",
    recoveryContact: "meghan.mcmichael@neohomeloans.com",
  },
  {
    name: "Plug and Play SM Dashboard",
    url: "https://plugandplaysm.com",
    category: "Social Media",
    username: "marketing@neohomeloans.com",
    credPassword: "PlugNPlay2233!!",
    recoveryContact: "marketing@neohomeloans.com",
  },
  {
    name: "Housing.link",
    url: "https://housing.link",
    category: "Marketing",
    username: "team+neo@housing.link",
    credPassword: "johxin-6nItwi-terbif",
    recoveryContact: "team+neo@housing.link",
  },
  {
    name: "Videobolt",
    url: "https://videobolt.net",
    category: "Creative",
    username: "colin.jenson",
    credPassword: "Password123!",
  },
  {
    name: "Duda",
    url: "https://www.duda.co",
    category: "Design",
    username: "neohomeloans1@gmail.com",
    credPassword: "NEOduda123!",
    recoveryContact: "neohomeloans1@gmail.com",
  },
  {
    name: "SEMrush",
    url: "https://www.semrush.com",
    category: "Analytics",
    username: "info@plugandplaysm.com",
    credPassword: "d#Marketing1!",
    recoveryContact: "info@plugandplaysm.com",
  },
  {
    name: "Jotform",
    url: "https://www.jotform.com",
    category: "Marketing",
    username: "cmjaxin",
    credPassword: "Jotmettleneo",
  },
];

async function main() {
  console.log("Seeding tools...");
  for (const tool of tools) {
    await db.tool.upsert({
      where: { id: tool.name }, // won't match, will always create
      update: {},
      create: {
        name: tool.name,
        url: tool.url,
        category: tool.category,
        username: tool.username ?? null,
        credPassword: tool.credPassword ?? null,
        recoveryContact: tool.recoveryContact ?? null,
        credKind: "SHARED",
      },
    }).catch(async () => {
      // upsert by name not supported — just create if not exists
      const existing = await db.tool.findFirst({ where: { name: tool.name } });
      if (!existing) {
        await db.tool.create({
          data: {
            name: tool.name,
            url: tool.url,
            category: tool.category,
            username: tool.username ?? null,
            credPassword: tool.credPassword ?? null,
            recoveryContact: tool.recoveryContact ?? null,
            credKind: "SHARED",
          },
        });
        console.log(`  ✓ Created: ${tool.name}`);
      } else {
        console.log(`  → Already exists: ${tool.name}`);
      }
    });
  }
  console.log("Done.");
}

main().catch(console.error).finally(() => db.$disconnect());
