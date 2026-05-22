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
  primaryUrlNote?: string; // e.g. "→ to correct as TheHardridgeTeam.com"
  nmlsNumber?: string;
}

export interface AuditResult {
  // Opening canonical entity sentence
  canonicalEntityStatement?: string;

  // Canonical NAP
  extractedNap: ExtractedNap;

  // Overall score
  score: number;

  // Score breakdown (5 categories)
  scoreBreakdown: {
    listingsHealth:        { score: number; max: 30; notes: string };
    reviews:               { score: number; max: 20; notes: string };
    websiteLocalRelevance: { score: number; max: 20; notes: string };
    brandConsistency:      { score: number; max: 15; notes: string };
    aiSearchReadiness:     { score: number; max: 15; notes: string };
  };

  // Numbered priority action items for the advisor
  actionItems: Array<{
    priority: number;
    platform: string;
    action: string;  // Full text: "Bold key term: description"
    url?: string;    // Link shown as "CLICK HERE" or small gray URL
  }>;

  // Checkbox-style conflict bullets
  conflicts: string[];

  // Audience analysis paragraphs
  mainAudienceServed?: string;
  whoYouAppearToServe?: string;
  perceivedStrengths?: string[];

  // All known/found social/directory profiles
  socials: Array<{
    platform: string;
    url: string;
    status: "OK" | "ISSUE" | "REMOVE" | "MISSING";
    notes?: string;
  }>;

  // Missing footprint notes
  missingFootprintNote?: string;
  dataAggregatorNote?: string;

  // Query visibility
  queryVisibility: {
    branded: string;
    nonBranded: string;
    topicClusters: string[];
    missedOpportunities: string[]; // Prefixed: "Homebuyers: ...", "Refinancers: ..."
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

async function fetchNapFormAsBase64(
  url: string
): Promise<{ data: string; mediaType: string } | null> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    if (contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf"))
      return { data: base64, mediaType: "application/pdf" };
    if (contentType.includes("png") || url.toLowerCase().endsWith(".png"))
      return { data: base64, mediaType: "image/png" };
    if (contentType.includes("webp") || url.toLowerCase().endsWith(".webp"))
      return { data: base64, mediaType: "image/webp" };
    if (contentType.includes("image") || /\.(jpg|jpeg)$/i.test(url))
      return { data: base64, mediaType: "image/jpeg" };
    return null;
  } catch {
    return null;
  }
}

export async function runVisibilityAudit(advisor: AdvisorData): Promise<AuditResult> {
  const client = new Anthropic();

  const napForm = advisor.napFormUrl
    ? await fetchNapFormAsBase64(advisor.napFormUrl)
    : null;

  const knownProfiles = advisor.channels.length
    ? advisor.channels
        .map((c) => `- ${c.platform}: ${c.url}${c.label ? ` (${c.label})` : ""}`)
        .join("\n")
    : "No social profiles on record yet.";

  const presentPlatforms = advisor.channels.map((c) => c.platform.toUpperCase());
  const majorPlatforms = [
    "WEBSITE", "GOOGLE_BUSINESS", "FACEBOOK", "INSTAGRAM",
    "LINKEDIN", "ZILLOW", "YOUTUBE", "YELP", "BBB", "EXPERIENCE",
  ];
  const missingPlatforms = majorPlatforms.filter((p) => !presentPlatforms.includes(p));

  const fallbackAddress = [
    advisor.streetAddress, advisor.city, advisor.state, advisor.zip,
  ].filter(Boolean).join(", ");

  const fallbackNap = [
    `Name: ${advisor.name}`,
    advisor.title       ? `Title: ${advisor.title}`               : null,
    advisor.category    ? `Category: ${advisor.category}`         : null,
    `NMLS #: ${advisor.nmlsNumber}`,
    fallbackAddress     ? `Address: ${fallbackAddress}`           : null,
    advisor.phone       ? `Phone: ${advisor.phone}`               : null,
    advisor.email       ? `Email: ${advisor.email}`               : null,
    advisor.serviceArea ? `Primary Service Area: ${advisor.serviceArea}` : null,
  ].filter(Boolean).join("\n");

  const prompt = `You are the NEO Advisor Visibility Strategist — a compliance-aware digital visibility auditor for NEO Home Loans mortgage advisors.

CORE RULES (enforce strictly):
- Always capitalize all three letters in NEO. Never write "Neo" or "neo."
- NEO Home Loans is an Equal Housing Opportunity Lender.
- Corporate lender: Better Mortgage Corporation, NMLS#330511.
- Never use long em dashes.
- Never use generic AI filler, robotic phrasing, or bloated language.
- Never guarantee rankings, verification, leads, or outcomes.
- Write as if advising a real person — plain English, specific, actionable.
- Every action item must reference THIS advisor's actual data. No generic advice.

${
  napForm
    ? `The attached document is this advisor's NAP (Name, Address, Phone) form. This is the CANONICAL SOURCE OF TRUTH. Extract every field precisely as written on the form. Every discrepancy found on any platform must be compared against these canonical values.`
    : `No NAP form uploaded. Use this profile data as the canonical NAP:\n${fallbackNap}`
}

KNOWN ONLINE PROFILES ON RECORD:
${knownProfiles}

PLATFORMS NOT YET FOUND IN THEIR PROFILE:
${missingPlatforms.length ? missingPlatforms.join(", ") : "All major platforms accounted for."}

YOUR TASK:
Perform a comprehensive, advisor-specific visibility audit. Every finding must reference actual data — specific platform names, specific URLs, specific wrong values vs. correct values.

WHAT TO AUDIT:
1. NAP inconsistencies — wrong phone number, old address, wrong suite, name not matching exactly, "NEO" not fully capitalized anywhere
2. Old employer branding — any prior company name (Cornerstone, Academy, loanDepot, etc.) on any live profile
3. Duplicate or conflicting profiles — multiple LinkedIn/Instagram/YouTube accounts
4. Incomplete profiles — missing bio, photos, hours, categories, NMLS disclosures
5. Missing high-authority platforms — GBP, BBB, Bing Places, Apple Maps, Experience.com, Yelp
6. Review platform gaps and reputation signals
7. Website local SEO — service area pages, local keywords, schema markup
8. AI search readiness — canonical entity signals, structured data, FAQ content

SCORING (conservative — only award points with evidence):
- Listings Health /30: NAP accuracy across directories, GBP/Zillow/BBB/Experience presence
- Reviews & Reputation /20: review volume, recency, platform diversity, sentiment
- Website Local Relevance /20: local keywords, service area pages, schema, mobile
- Brand & Entity Consistency /15: identical name/title/photo/employer everywhere, no legacy branding
- AI Search Readiness /15: clear canonical entity signals, FAQ content, structured data

ACTION ITEMS must be:
- Numbered 1 through N (most urgent first)
- Specific to THIS advisor's actual data (mention real platform names, real wrong values)
- Written as direct instructions: "Update your [Platform] [field] from '[wrong]' to '[correct]'"
- Include the actual profile URL when available
- Format: start with a bold key term followed by a colon, then the specific action detail
  Example: "Remove Old YouTube Channel: Your Cornerstone-era YouTube channel '[Channel Name]' is still live and publicly indexed. Remove or delete this channel to eliminate old employer branding."

CONFLICT ITEMS must be:
- Specific facts found that contradict the canonical NAP
- Written as plain factual statements (not instructions)
- Example: "LinkedIn title shows 'Loan Officer at Cornerstone' — canonical title is Mortgage Advisor at NEO Home Loans"

Return ONLY raw JSON — no markdown, no code fences, no explanation:

{
  "canonicalEntityStatement": "<1-2 sentences. Example: 'Cody Hardridge, NMLS #329626, Team Lead of The Hardridge Team and Division Leader at NEO Home Loans, serving Oklahoma City and surrounding areas.'>",
  "extractedNap": {
    "name": "<full advisor name from NAP form>",
    "teamName": "<team name if any, else empty string>",
    "title": "<canonical job title>",
    "address": "<full canonical address>",
    "phone": "<canonical phone>",
    "email": "<canonical email>",
    "category": "<business category, e.g. Mortgage Lender>",
    "serviceArea": "<primary market/city>",
    "primaryUrl": "<primary website URL>",
    "primaryUrlNote": "<correction note if URL should change, else empty>",
    "nmlsNumber": "<NMLS number>"
  },
  "score": <0-100>,
  "scoreBreakdown": {
    "listingsHealth":        { "score": <0-30>, "max": 30, "notes": "<2-4 sentences of specific findings. Reference actual platforms and what was found.>" },
    "reviews":               { "score": <0-20>, "max": 20, "notes": "<2-4 sentences>" },
    "websiteLocalRelevance": { "score": <0-20>, "max": 20, "notes": "<2-4 sentences>" },
    "brandConsistency":      { "score": <0-15>, "max": 15, "notes": "<2-4 sentences. This is the biggest scoring area for cleanup — be specific about what is inconsistent.>" },
    "aiSearchReadiness":     { "score": <0-15>, "max": 15, "notes": "<2-4 sentences>" }
  },
  "actionItems": [
    {
      "priority": <1 through N>,
      "platform": "<Platform name>",
      "action": "<Bold key term: Specific action description referencing actual data>",
      "url": "<direct URL to the profile or management page if known>"
    }
  ],
  "conflicts": [
    "<Specific conflict found. Format: '[Platform] shows [wrong value] — canonical [field] is [correct value]'>"
  ],
  "mainAudienceServed": "<1-2 paragraphs describing who this advisor actually serves, based on their NAP form and profile data. Include loan types, geography, niche markets, and any notable background.>",
  "whoYouAppearToServe": "<1-2 paragraphs describing the audience and positioning that comes through in their public profiles — loan types, locations, recurring positioning themes from reviews/bios.>",
  "perceivedStrengths": [
    "<Strength 1 based on review sentiment, bio content, or positioning signals>",
    "<Strength 2>",
    "<Strength 3>"
  ],
  "socials": [
    {
      "platform": "<Platform>",
      "url": "<full URL>",
      "status": "<OK|ISSUE|REMOVE|MISSING>",
      "notes": "<Specific issue or empty if OK. For REMOVE: explain why. For ISSUE: state what is wrong and what the correct value should be.>"
    }
  ],
  "missingFootprintNote": "<Which specific high-authority platforms were not found in this audit and why they matter for visibility. Be specific about platform names.>",
  "dataAggregatorNote": "<Assessment of data aggregator risk based on any address/phone inconsistencies found. Note this is an inference, not a verified finding.>",
  "queryVisibility": {
    "branded": "<Assessment of branded search visibility — searches containing the advisor's name or NMLS. What shows up, what's clean, what's fragmented.>",
    "nonBranded": "<Assessment of non-branded local search visibility — mortgage + city searches. What's working, where competitors dominate.>",
    "topicClusters": [
      "<Topic cluster already strong for this advisor>",
      "<Topic cluster 2>"
    ],
    "missedOpportunities": [
      "Homebuyers: <specific search queries this advisor is missing, comma-separated>",
      "Refinancers/homeowners: <specific refinance/homeowner queries>",
      "Referral partners: <specific referral-partner queries>"
    ],
    "serviceAreaExpansion": "<Specific cities/suburbs this advisor could expand into based on their market, with context.>"
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
          media_type: napForm.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/webp"
            | "image/gif",
          data: napForm.data,
        },
      } as Anthropic.Messages.ContentBlockParam);
    }
  }

  messageContent.push({ type: "text", text: prompt });

  // Prefill the assistant turn with `{` — forces Claude to output pure JSON
  // continuation without any preamble, markdown, or code fences.
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8192,
    messages: [
      { role: "user", content: messageContent },
      { role: "assistant", content: [{ type: "text", text: "{" }] },
    ],
  });

  const continuation =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Restore the opening brace we used as the prefill seed
  let jsonStr = ("{" + continuation).trim();

  // Strip any accidental markdown fences the model might still emit
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  // Repair common JSON issues Claude sometimes produces
  jsonStr = repairJson(jsonStr);

  let result: AuditResult;
  try {
    result = JSON.parse(jsonStr);
  } catch (err) {
    // Log enough context to diagnose the bad region without flooding logs
    const pos = (err as SyntaxError).message.match(/position (\d+)/)?.[1];
    const at = pos ? Number(pos) : jsonStr.length;
    console.error(
      "[visibility-audit] JSON parse failed:",
      (err as SyntaxError).message,
      "\n--- surrounding context ---\n",
      jsonStr.slice(Math.max(0, at - 120), at + 120),
      "\n--- end context ---"
    );
    throw err;
  }
  return result;
}

/**
 * Best-effort JSON repair for the subset of issues Claude sometimes produces:
 *  - Trailing commas before } or ]
 *  - Single-line // comments
 *  - Multi-line /* … *\/ comments
 *  - Em-dashes (—) that break string parsing (replaced with hyphen)
 *  - Unescaped newlines inside string values
 */
function repairJson(raw: string): string {
  let s = raw;

  // Remove // comments (only outside string literals — simple heuristic)
  s = s.replace(/(?<![":,\w])\/\/[^\n]*/g, "");

  // Remove /* … */ block comments
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove trailing commas before closing braces/brackets
  s = s.replace(/,(\s*[}\]])/g, "$1");

  // Replace em-dash with regular hyphen inside strings
  s = s.replace(/—/g, "-");

  // Replace literal tab characters inside strings with \t
  s = s.replace(/\t/g, "\\t");

  return s;
}
