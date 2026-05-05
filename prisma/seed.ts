import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAM = [
  { name: "Amber Mitchell",   email: "amber.mitchell@neohomeloans.com",   color: "#5bcbf5", initials: "AM", role: "MARKETING_DIRECTOR" as const },
  { name: "Jordan Torres",    email: "jordan.torres@neohomeloans.com",    color: "#22c55e", initials: "JT", role: "BRAND_LEAD" as const },
  { name: "Kayla Chen",       email: "kayla.chen@neohomeloans.com",       color: "#8b5cf6", initials: "KC", role: "CONTENT_STRATEGIST" as const },
  { name: "Sam Nguyen",       email: "sam.nguyen@neohomeloans.com",       color: "#f59e0b", initials: "SN", role: "PERFORMANCE_LEAD" as const },
  { name: "Riley Monroe",     email: "riley.monroe@neohomeloans.com",     color: "#ef4444", initials: "RM", role: "DESIGNER" as const },
  { name: "Parker Reid",      email: "parker.reid@neohomeloans.com",      color: "#06b6d4", initials: "PR", role: "GROWTH_PM" as const },
];

async function main() {
  console.log("Seeding database...");

  // Upsert team users
  const users: Record<string, { id: string }> = {};
  for (const member of TEAM) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        name: member.name,
        email: member.email,
        color: member.color,
        initials: member.initials,
        role: member.role,
        isActive: true,
      },
    });
    const key = member.initials.toLowerCase();
    users[key] = user;
  }

  const amber = users["am"];
  const jordan = users["jt"];
  const kayla = users["kc"];
  const sam = users["sn"];
  const riley = users["rm"];
  const parker = users["pr"];

  // Meetings
  const m1 = await prisma.meeting.create({
    data: {
      title: "Spring Launch '26 Kickoff",
      scheduledAt: new Date("2026-04-14T10:00:00"),
      durationMinutes: 90,
      recurrence: "ONE_OFF",
      status: "COMPLETED",
      hostId: amber.id,
      attendees: {
        create: [
          { userId: amber.id },
          { userId: jordan.id },
          { userId: kayla.id },
          { userId: sam.id },
          { userId: riley.id },
          { userId: parker.id },
        ],
      },
      sections: {
        create: [
          { title: "Campaign Overview", body: "Reviewed the three hero directions. Team voted for Direction B (lifestyle photography) as the primary. Direction A retained as fallback for digital only.", position: 0 },
          { title: "Timeline Review", body: "Photo shoot locked for April 22–23. Creative assets needed by May 1 for paid launch on May 6.", position: 1 },
          { title: "Budget Discussion", body: "Photography: $12k approved. Video production quote pending from two vendors. Parker to bring back numbers by EOW.", position: 2 },
        ],
      },
      decisions: {
        create: [
          { text: "Direction B selected as primary campaign concept" },
          { text: "Photo shoot date locked: April 22–23" },
          { text: "All final assets due May 1 for paid launch" },
        ],
      },
    },
  });

  const m2 = await prisma.meeting.create({
    data: {
      title: "Weekly Marketing Sync",
      scheduledAt: new Date("2026-04-21T09:00:00"),
      durationMinutes: 45,
      recurrence: "WEEKLY",
      status: "COMPLETED",
      hostId: amber.id,
      attendees: {
        create: [
          { userId: amber.id },
          { userId: jordan.id },
          { userId: kayla.id },
          { userId: sam.id },
        ],
      },
      sections: {
        create: [
          { title: "Status Updates", body: "Spring launch on track. Lifecycle drip in legal review, expected back Thursday. TikTok ad accounts pending approval.", position: 0 },
          { title: "Blockers", body: "Disclosure language not finalized — blocks lifecycle send. Kayla to follow up with legal directly.", position: 1 },
        ],
      },
    },
  });

  await prisma.meeting.create({
    data: {
      title: "Q2 Analytics Review",
      scheduledAt: new Date("2026-05-12T14:00:00"),
      durationMinutes: 60,
      recurrence: "ONE_OFF",
      status: "UPCOMING",
      hostId: parker.id,
      attendees: {
        create: [
          { userId: parker.id },
          { userId: amber.id },
          { userId: sam.id },
        ],
      },
    },
  });

  // Action items
  await prisma.actionItem.createMany({
    data: [
      { title: "Share photo shoot call sheet with full team", status: "OPEN", priority: "HIGH", meetingId: m1.id, assigneeId: jordan.id, dueDate: new Date("2026-04-19") },
      { title: "Get two video production quotes", status: "OPEN", priority: "HIGH", meetingId: m1.id, assigneeId: parker.id, dueDate: new Date("2026-04-18") },
      { title: "Approve hero copy variations", status: "DONE", priority: "HIGH", meetingId: m1.id, assigneeId: amber.id },
      { title: "Follow up with legal on disclosure language", status: "IN_PROGRESS", priority: "HIGH", meetingId: m2.id, assigneeId: kayla.id, dueDate: new Date("2026-04-25") },
      { title: "Stand up TikTok + Reels ad accounts", status: "OPEN", priority: "MEDIUM", meetingId: m2.id, assigneeId: sam.id, dueDate: new Date("2026-04-28") },
    ],
  });

  // Tools
  await prisma.tool.createMany({
    data: [
      { name: "HubSpot", url: "https://app.hubspot.com", category: "CRM", credKind: "SSO", seats: 6, notes: "Primary CRM and email platform. SSO via Google Workspace.", ownerId: amber.id },
      { name: "Canva for Teams", url: "https://www.canva.com", category: "Design", credKind: "SSO", seats: 6, notes: "Brand asset creation and template management.", ownerId: riley.id },
      { name: "SEMrush", url: "https://www.semrush.com", category: "SEO", credKind: "SHARED", seats: 3, notes: "SEO and competitor research. Shared login in vault.", vaultLink: "op://Marketing/SEMrush/credentials", ownerId: parker.id },
      { name: "Sprout Social", url: "https://app.sproutsocial.com", category: "Social", credKind: "SHARED", seats: 4, notes: "Social scheduling and analytics across all channels.", ownerId: sam.id },
      { name: "Loom", url: "https://www.loom.com", category: "Video", credKind: "SSO", seats: 6, notes: "Internal async video communication.", ownerId: jordan.id },
      { name: "Figma", url: "https://www.figma.com", category: "Design", credKind: "SSO", seats: 4, notes: "UI design and prototyping.", ownerId: riley.id },
      { name: "Klaviyo", url: "https://www.klaviyo.com", category: "Email", credKind: "VAULT", seats: 2, notes: "Email automation for lifecycle flows.", vaultLink: "op://Marketing/Klaviyo/credentials", ownerId: kayla.id },
      { name: "Google Analytics 4", url: "https://analytics.google.com", category: "Analytics", credKind: "SSO", seats: 6, notes: "Web analytics. Service account managed by Parker.", ownerId: parker.id },
    ],
  });

  // Advisors
  const advisors = [
    { name: "Marcus Webb",   nmlsNumber: "1234567", brand: "Webb Mortgage",    leader: "Division A", city: "Phoenix",      state: "AZ", color: "#5bcbf5", initials: "MW" },
    { name: "Lisa Tran",     nmlsNumber: "2345678", brand: "Tran Home Loans",  leader: "Division A", city: "San Diego",    state: "CA", color: "#22c55e", initials: "LT" },
    { name: "Derek Santos",  nmlsNumber: "3456789", brand: "Santos Lending",   leader: "Division B", city: "Austin",       state: "TX", color: "#f59e0b", initials: "DS" },
    { name: "Amanda Cruz",   nmlsNumber: "4567890", brand: "Cruz Mortgage",    leader: "Division B", city: "Denver",       state: "CO", color: "#8b5cf6", initials: "AC" },
    { name: "Brian O'Neil",  nmlsNumber: "5678901", brand: "O'Neil Lending",   leader: "Division A", city: "Portland",     state: "OR", color: "#ef4444", initials: "BO" },
    { name: "Rachel Kim",    nmlsNumber: "6789012", brand: "Kim Home Finance", leader: "Division C", city: "Nashville",    state: "TN", color: "#06b6d4", initials: "RK" },
  ];

  for (const a of advisors) {
    const advisor = await prisma.advisor.create({
      data: {
        ...a,
        status: "ACTIVE",
        auditFormUrl: `https://forms.example.com/audit/${a.initials.toLowerCase()}`,
        matrixUrl: `https://docs.example.com/matrix/${a.initials.toLowerCase()}`,
        canvaUrl: `https://canva.com/team/${a.initials.toLowerCase()}`,
        socialToolUrl: `https://sproutsocial.com/profiles/${a.initials.toLowerCase()}`,
      },
    });

    await prisma.advisorChannel.createMany({
      data: [
        { advisorId: advisor.id, platform: "FACEBOOK", url: `https://facebook.com/${a.name.replace(" ", "").toLowerCase()}`, label: a.name },
        { advisorId: advisor.id, platform: "INSTAGRAM", url: `https://instagram.com/${a.name.replace(" ", "").toLowerCase()}`, label: `@${a.name.replace(" ", "").toLowerCase()}` },
        { advisorId: advisor.id, platform: "LINKEDIN", url: `https://linkedin.com/in/${a.name.replace(" ", "-").toLowerCase()}`, label: a.name },
      ],
    });
  }

  // Tasks
  const firstAdvisor = await prisma.advisor.findFirst();
  await prisma.task.createMany({
    data: [
      { title: "Approve hero copy variations", ownerId: amber.id, dueBucket: "today", priority: "HIGH", status: "TODO", scope: "TEAM" },
      { title: "Lock photo shoot call sheet", ownerId: jordan.id, dueBucket: "today", priority: "HIGH", status: "TODO", scope: "TEAM" },
      { title: "Push lifecycle drip to legal review", ownerId: kayla.id, dueBucket: "tomorrow", priority: "HIGH", status: "TODO", scope: "TEAM" },
      { title: "Stand up TikTok + Reels ad accounts", ownerId: sam.id, dueBucket: "tomorrow", priority: "MEDIUM", status: "TODO", scope: "TEAM" },
      { title: "Draft third-reviewer proposal", ownerId: riley.id, dueBucket: "this-week", priority: "MEDIUM", status: "TODO", scope: "TEAM" },
      { title: "Build Q2 reporting dashboard", ownerId: parker.id, dueBucket: "this-week", priority: "MEDIUM", status: "TODO", scope: "TEAM" },
      { title: "Audit competitor landing pages", ownerId: kayla.id, dueBucket: "next-week", priority: "LOW", status: "TODO", scope: "TEAM" },
      { title: "Renegotiate SEMrush seats", ownerId: amber.id, dueBucket: "this-week", priority: "LOW", status: "TODO", scope: "PERSONAL" },
      { title: "1:1 prep — performance team", ownerId: amber.id, dueBucket: "tomorrow", priority: "MEDIUM", status: "TODO", scope: "PERSONAL" },
      { title: "Quarterly OKR draft", ownerId: amber.id, dueBucket: "later", priority: "MEDIUM", status: "TODO", scope: "TEAM" },
      { title: "Sync with legal on disclosure language", ownerId: amber.id, dueBucket: "this-week", priority: "HIGH", status: "DONE", scope: "TEAM" },
    ],
  });

  // Ideas
  await prisma.idea.createMany({
    data: [
      { title: "Customer story video series", body: "Three-minute mini-docs with recent advisors. Pair with email + LinkedIn cut-downs.", authorId: kayla.id, tags: ["content", "brand"], status: "QUEUED" },
      { title: "Refer-a-friend with branded swag", body: "Low-lift growth loop: existing borrowers refer, both sides get a curated tote.", authorId: parker.id, tags: ["growth"], status: "PARKED" },
      { title: "Switch to a single weekly newsletter", body: "Consolidate the four product emails into one editorial-feeling roundup.", authorId: kayla.id, tags: ["content", "ops"], status: "ACTIVE" },
      { title: "TikTok-first hero campaign", body: "What if the spring launch led with vertical video instead of the website hero?", authorId: sam.id, tags: ["campaign", "growth"], status: "QUEUED" },
      { title: "Brand audio identity", body: "Commission a short sting + button sound. Use across video, podcast intros, in-product.", authorId: riley.id, tags: ["brand"], status: "PARKED" },
      { title: "AI-assisted FAQ refresh", body: "Use last quarter's support tickets to rewrite the FAQ with real customer language.", authorId: amber.id, tags: ["content", "ops"], status: "SHIPPED" },
      { title: "Local field events with realtors", body: "Run quarterly happy-hours in the top 5 advisor cities. Co-brand with realtor partners.", authorId: jordan.id, tags: ["campaign", "brand"], status: "QUEUED" },
      { title: "Refresh the welcome packet", body: "Trade the PDF for a personalized microsite with the advisor's photo + next steps.", authorId: riley.id, tags: ["product", "brand"], status: "ACTIVE" },
    ],
  });

  // Add some votes to ideas
  const ideas = await prisma.idea.findMany();
  const voteData: { ideaId: string; userId: string }[] = [];
  for (const idea of ideas) {
    const voters = [amber, jordan, kayla, sam, riley, parker].filter((u) => u.id !== idea.authorId).slice(0, 3);
    for (const voter of voters) {
      voteData.push({ ideaId: idea.id, userId: voter.id });
    }
  }
  await prisma.ideaVote.createMany({ data: voteData, skipDuplicates: true });

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
