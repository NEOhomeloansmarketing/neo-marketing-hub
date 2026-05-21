import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedNap {
  name?: string;
  teamName?: string;
  title?: string;
  address?: string;
  phone?: string;
  email?: string;
  category?: string;
  serviceArea?: string;
  primaryUrl?: string;
  nmlsNumber?: string;
}

export interface AuditResult {
  extractedNap: ExtractedNap;
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

export interface AdvisorData {
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
  napFormUrl?: string | null;
  channels: Array<{ platform: string; url: string; label?: string | null }>;
}

async function fetchNapFormAsBase64(url: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    if (contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
      return { data: base64, mediaType: "application/pdf" };
    }
    if (contentType.includes("png") || url.toLowerCase().endsWith(".png")) {
      return { data: base64, mediaType: "image/png" };
    }
    if (contentType.includes("webp") || url.toLowerCase().endsWith(".webp")) {
      return { data: base64, mediaType: "image/webp" };
    }
    if (contentType.includes("image") || /\.(jpg|jpeg)$/i.test(url)) {
      return { data: base64, mediaType: "image/jpeg" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function runVisibilityAudit(advisor: AdvisorData): Promise<AuditResult> {
  const client = new Anthropic();

  const napForm = advisor.napFormUrl ? await fetchNapFormAsBase64(advisor.napFormUrl) : null;

  const knownProfiles = advisor.channels.length
    ? advisor.channels.map((c) => `- ${c.platform}: ${c.url}${c.label ? ` (${c.label})` : ""}`).join("\n")
    : "No social profiles on record yet.";

  const presentPlatforms = advisor.channels.map((c) => c.platform.toUpperCase());
  const majorPlatforms = ["WEBSITE", "GOOGLE_BUSINESS", "FACEBOOK", "INSTAGRAM", "LINKEDIN", "ZILLOW", "YOUTUBE", "YELP"];
  const missingPlatforms = majorPlatforms.filter((p) => !presentPlatforms.includes(p));

  const fallbackAddress = [advisor.streetAddress, advisor.city, advisor.state, advisor.zip].filter(Boolean).join(", ");
  const fallbackNap = [
    `Name: ${advisor.name}`,
    advisor.title ? `Title: ${advisor.title}` : null,
    advisor.category ? `Category: ${advisor.category}` : null,
    `NMLS #: ${advisor.nmlsNumber}`,
    fallbackAddress ? `Address: ${fallbackAddress}` : null,
    advisor.phone ? `Phone: ${advisor.phone}` : null,
    advisor.email ? `Email: ${advisor.email}` : null,
    advisor.serviceArea ? `Primary Service Area: ${advisor.serviceArea}` : null,
  ].filter(Boolean).join("\n");

  const textPrompt = `You are an expert digital visibility auditor for mortgage professionals at NEO Home Loans.

${napForm
    ? `The attached document is this advisor's NAP (Name, Address, Phone) form — it defines the CANONICAL information that must appear identically everywhere online. Extract the canonical NAP data from this form first, then use it as the source of truth for the entire audit.`
    : `No NAP form has been uploaded yet. Use the following profile data as the canonical NAP:\n${fallbackNap}`
}

## KNOWN ONLINE PROFILES ON RECORD:
${knownProfiles}

## PLATFORMS NOT YET ON RECORD (may be missing or need to be created):
${missingPlatforms.length ? missingPlatforms.join(", ") : "All major platforms accounted for"}

## YOUR TASK:
Perform a comprehensive visibility audit comparing each known profile against the canonical NAP. Flag every discrepancy:

1. NAP inconsistencies — wrong phone, old address, old suite number, name variations, "NEO" not fully capitalized (always "NEO Home Loans")
2. Old employer branding — previous company names/logos/URLs still showing (Cornerstone, Academy, loanDepot, etc.)
3. Duplicate or conflicting profiles — multiple LinkedIn accounts, old Instagram handles, stale YouTube channels
4. Incomplete profiles — missing bio, photo, hours, categories, contact info
5. Missing high-authority platforms — Google Business Profile, Zillow, BBB, Bing Places, Apple Maps, Experience.com
6. Review platform gaps
7. Website local SEO — service area pages, local keywords, schema markup
8. AI search readiness — clear canonical entity signals, FAQ content, structured data

## SCORING (be realistic and conservative — only award full points with clear evidence):
- Listings Health /30: NAP consistency across directories, GMB/Zillow/BBB/Experience presence
- Reviews /20: review volume, recency, platform diversity, response rate
- Website Local Relevance /20: local keywords, service area pages, schema, mobile
- Brand Consistency /15: identical name/title/photo/employer everywhere, no legacy branding
- AI Search Readiness /15: clear canonical entity signals, FAQ content, structured data

Generate 8–14 specific, actionable items in priority order (1 = most urgent).

Return ONLY raw JSON — no markdown, no code fences, no explanation:

{
  "extractedNap": {
    "name": "<full name>",
    "teamName": "<team name if any, else empty string>",
    "title": "<job title>",
    "address": "<full canonical address>",
    "phone": "<canonical phone number>",
    "email": "<canonical email>",
    "category": "<business category>",
    "serviceArea": "<primary service area>",
    "primaryUrl": "<primary website URL>",
    "nmlsNumber": "<NMLS number>"
  },
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
    { "platform": "<name>", "url": "<url>", "status": "OK|ISSUE|REMOVE|MISSING", "notes": "<what needs fixing>" }
  ],
  "queryVisibility": {
    "branded": "<branded search visibility assessment>",
    "nonBranded": "<local/non-branded search visibility assessment>",
    "topicClusters": ["<relevant topic>"],
    "missedOpportunities": ["<specific missed query opportunity>"],
    "serviceAreaExpansion": "<service area expansion opportunities>"
  }
}`;

  const messageContent: Anthropic.Messages.ContentBlockParam[] = [];

  if (napForm) {
    if (napForm.mediaType === "application/pdf") {
      messageContent.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: napForm.data },
      } as Anthropic.Messages.ContentBlockParam);
    } else {
      messageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: napForm.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: napForm.data,
        },
      } as Anthropic.Messages.ContentBlockParam);
    }
  }

  messageContent.push({ type: "text", text: textPrompt });

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: messageContent }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  let jsonStr = responseText.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const result: AuditResult = JSON.parse(jsonStr);
  return result;
}
