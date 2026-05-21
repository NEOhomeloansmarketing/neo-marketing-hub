import Anthropic from "@anthropic-ai/sdk";

export interface AuditResult {
  score: number;
  scoreBreakdown: {
    listingsHealth: { score: number; max: 30; notes: string };
    reviews: { score: number; max: 20; notes: string };
    websiteLocalRelevance: { score: number; max: 20; notes: string };
    brandConsistency: { score: number; max: 15; notes: string };
    aiSearchReadiness: { score: number; max: 15; notes: string };
  };
  actionItems: Array<{
    priority: number;
    platform: string;
    action: string;
    url?: string;
  }>;
  conflicts: string[];
  socials: Array<{
    platform: string;
    url: string;
    status: "OK" | "ISSUE" | "REMOVE" | "MISSING";
    notes?: string;
  }>;
  queryVisibility: {
    branded: string;
    nonBranded: string;
    topicClusters: string[];
    missedOpportunities: string[];
    serviceAreaExpansion: string;
  };
}

interface AdvisorData {
  name: string;
  nmlsNumber: string;
  email?: string | null;
  phone?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  title?: string | null;
  category?: string | null;
  serviceArea?: string | null;
  channels: Array<{ platform: string; url: string; label?: string | null }>;
}

export async function runVisibilityAudit(advisor: AdvisorData): Promise<AuditResult> {
  const client = new Anthropic();

  const fullAddress = [advisor.streetAddress, advisor.city, advisor.state, advisor.zip]
    .filter(Boolean)
    .join(", ");

  const canonicalNap = [
    `Name: ${advisor.name}`,
    advisor.title ? `Title: ${advisor.title}` : null,
    advisor.category ? `Category: ${advisor.category}` : null,
    `NMLS #: ${advisor.nmlsNumber}`,
    fullAddress ? `Address: ${fullAddress}` : null,
    advisor.phone ? `Phone: ${advisor.phone}` : null,
    advisor.email ? `Email: ${advisor.email}` : null,
    advisor.serviceArea ? `Primary Service Area: ${advisor.serviceArea}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const knownProfiles = advisor.channels.length
    ? advisor.channels
        .map((c) => `- ${c.platform}: ${c.url}${c.label ? ` (${c.label})` : ""}`)
        .join("\n")
    : "No social profiles on record.";

  // Check which major platforms are missing
  const presentPlatforms = advisor.channels.map((c) => c.platform.toUpperCase());
  const majorPlatforms = ["WEBSITE", "GOOGLE_BUSINESS", "FACEBOOK", "INSTAGRAM", "LINKEDIN", "ZILLOW", "YOUTUBE", "YELP"];
  const missingPlatforms = majorPlatforms.filter((p) => !presentPlatforms.includes(p));

  const prompt = `You are an expert digital visibility auditor for mortgage professionals at NEO Home Loans.

## CANONICAL NAP — This is what should appear EVERYWHERE online:
${canonicalNap}

## KNOWN ONLINE PROFILES ON RECORD:
${knownProfiles}

## PLATFORMS NOT YET ON RECORD (may be missing or unverified):
${missingPlatforms.join(", ") || "All major platforms accounted for"}

## YOUR TASK:
Produce a thorough, realistic visibility audit for this mortgage advisor. Analyze:

1. NAP consistency — Are their name, address, phone, email, and title likely consistent everywhere? Flag any common issues (old employer branding, phone number variants, address suite number discrepancies, capitalization of "NEO")
2. Duplicate/stale profiles — Old company profiles that should be removed
3. Missing high-authority platforms — Google Business Profile, Zillow, BBB, Bing Places, Apple Maps, Yelp, Experience.com
4. Profile completeness — Are known profiles fully filled out with correct info?
5. Review presence — Are they collecting reviews on the right platforms?
6. Website local SEO — Do they have service area pages, local keywords, schema markup?
7. AI search readiness — Entity clarity, FAQ content, citation signals for AI-powered search

## SCORING RUBRIC (be realistic and conservative — only award full points with clear evidence):
- Listings Health /30: GMB completeness, Zillow/Yelp/BBB presence, NAP consistency
- Reviews /20: review count, recency, response rate, cross-platform sentiment
- Website Local Relevance /20: local keywords, service area pages, schema, mobile
- Brand Consistency /15: consistent name/photo/bio, no old employer branding
- AI Search Readiness /15: entity clarity, structured data, FAQ content, citation signals

## IMPORTANT:
- Generate 8-14 specific, actionable items in priority order
- Be specific about what platform and exactly what needs to change
- Flag any old/duplicate social accounts that need to be removed
- Note any NEO branding issues (always "NEO Home Loans" with all caps NEO)
- For missing platforms, include them as action items to join/create

Return ONLY raw JSON (no markdown, no code fences, no explanation):

{
  "score": <0-100>,
  "scoreBreakdown": {
    "listingsHealth": { "score": <number>, "max": 30, "notes": "<2-3 sentences>" },
    "reviews": { "score": <number>, "max": 20, "notes": "<2-3 sentences>" },
    "websiteLocalRelevance": { "score": <number>, "max": 20, "notes": "<2-3 sentences>" },
    "brandConsistency": { "score": <number>, "max": 15, "notes": "<2-3 sentences>" },
    "aiSearchReadiness": { "score": <number>, "max": 15, "notes": "<2-3 sentences>" }
  },
  "actionItems": [
    { "priority": <1-14>, "platform": "<platform name>", "action": "<specific action>", "url": "<url if known>" }
  ],
  "conflicts": ["<specific conflict or inconsistency found>"],
  "socials": [
    { "platform": "<name>", "url": "<url>", "status": "OK|ISSUE|REMOVE|MISSING", "notes": "<what to fix if needed>" }
  ],
  "queryVisibility": {
    "branded": "<assessment of branded search visibility>",
    "nonBranded": "<assessment of local/non-branded search visibility>",
    "topicClusters": ["<relevant topic>"],
    "missedOpportunities": ["<specific missed search opportunity>"],
    "serviceAreaExpansion": "<service area expansion opportunities>"
  }
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip any accidental markdown wrapping
  let jsonStr = responseText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const result: AuditResult = JSON.parse(jsonStr);
  return result;
}
