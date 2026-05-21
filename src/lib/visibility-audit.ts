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

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NEO-Audit-Bot/1.0)" },
    });
    clearTimeout(timer);
    const text = await res.text();
    // Strip HTML tags and collapse whitespace
    const stripped = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, 3000);
  } catch {
    return "";
  }
}

export async function runVisibilityAudit(advisor: AdvisorData): Promise<AuditResult> {
  const client = new Anthropic();

  // Fetch content from each channel URL
  const channelContents: Array<{ platform: string; url: string; content: string }> = [];
  for (const ch of advisor.channels) {
    if (!ch.url) continue;
    const content = await fetchUrlContent(ch.url);
    channelContents.push({ platform: ch.platform, url: ch.url, content });
  }

  const fullAddress = [
    advisor.streetAddress,
    advisor.city,
    advisor.state,
    advisor.zip,
  ]
    .filter(Boolean)
    .join(", ");

  const canonicalNap = [
    `Name: ${advisor.name}`,
    advisor.title ? `Title: ${advisor.title}` : null,
    advisor.category ? `Category: ${advisor.category}` : null,
    advisor.nmlsNumber ? `NMLS #: ${advisor.nmlsNumber}` : null,
    fullAddress ? `Address: ${fullAddress}` : null,
    advisor.phone ? `Phone: ${advisor.phone}` : null,
    advisor.email ? `Email: ${advisor.email}` : null,
    advisor.serviceArea ? `Service Area: ${advisor.serviceArea}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const channelSections = channelContents.length
    ? channelContents
        .map(
          (c) =>
            `## ${c.platform}: ${c.url}\n${c.content ? `Content preview:\n${c.content}` : "(Could not fetch content)"}`
        )
        .join("\n\n---\n\n")
    : "No social channels recorded.";

  const prompt = `You are an expert digital visibility auditor for mortgage professionals. Your job is to analyze an advisor's online presence and produce a structured audit report.

## CANONICAL NAP (Name, Address, Phone) — This is what should appear EVERYWHERE:
${canonicalNap}

## KNOWN ONLINE PROFILES & CONTENT FOUND:
${channelSections}

## YOUR TASK:
Analyze this advisor's digital footprint and produce a comprehensive visibility audit. Look for:
1. NAP inconsistencies across platforms (different name spellings, old addresses, old phone numbers, old employer branding)
2. Duplicate or conflicting profiles
3. Missing platforms where a mortgage professional should be present (Google Business Profile, Zillow, etc.)
4. Old employer branding still showing (previous company logos, bios, URLs)
5. Incomplete or thin profiles
6. Review presence and strategy
7. Website local SEO relevance
8. AI search readiness (structured data, FAQ content, clear entity signals)

## SCORING RUBRIC:
- Listings Health: /30 (GMB completeness, Zillow/Yelp presence, NAP consistency across directories)
- Reviews: /20 (review count, recency, response rate, sentiment)
- Website Local Relevance: /20 (local keywords, service area pages, schema markup, mobile performance)
- Brand Consistency: /15 (same name/photo/bio everywhere, no old employer branding)
- AI Search Readiness: /15 (entity clarity, FAQ content, structured data, citation signals)

Be realistic and conservative with scores — only award full points when there is clear evidence.

Return ONLY valid JSON matching this exact TypeScript interface (no markdown, no explanation, just raw JSON):

{
  "score": <number 0-100>,
  "scoreBreakdown": {
    "listingsHealth": { "score": <number>, "max": 30, "notes": "<string>" },
    "reviews": { "score": <number>, "max": 20, "notes": "<string>" },
    "websiteLocalRelevance": { "score": <number>, "max": 20, "notes": "<string>" },
    "brandConsistency": { "score": <number>, "max": 15, "notes": "<string>" },
    "aiSearchReadiness": { "score": <number>, "max": 15, "notes": "<string>" }
  },
  "actionItems": [
    { "priority": <1-10>, "platform": "<string>", "action": "<string>", "url": "<optional string>" }
  ],
  "conflicts": ["<string>"],
  "socials": [
    { "platform": "<string>", "url": "<string>", "status": "OK|ISSUE|REMOVE|MISSING", "notes": "<optional string>" }
  ],
  "queryVisibility": {
    "branded": "<string describing branded search visibility>",
    "nonBranded": "<string describing non-branded/local search visibility>",
    "topicClusters": ["<topic>"],
    "missedOpportunities": ["<opportunity>"],
    "serviceAreaExpansion": "<string>"
  }
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from the response (handle potential markdown wrapping)
  let jsonStr = responseText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result: AuditResult = JSON.parse(jsonStr);
  return result;
}
