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

  // Canonical block — exact NAP text formatted for use everywhere online
  canonicalBlock?: string;

  // One-line canonical public display format
  canonicalPublicDisplay?: string;

  // Positioning statement to use everywhere (1-2 sentences)
  positioningStatement?: string;

  // Best difference language (advisor's unique differentiator)
  bestDifferenceLanguage?: string;

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
    action: string;  // Full text: "Bold key term: 1-2 sentence description"
    url?: string;    // Direct link — rendered as "CLICK HERE"
  }>;

  // Grouped conflicts: "Main conflict N: [Type] — explanation"
  conflicts: string[];

  // Competitive gap analysis
  competitiveGapAnalysis?: {
    advantages: string[];
    gaps: string[];
  };

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

  // Content themes specific to this advisor
  contentThemes?: string[];

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
- Never use long em dashes (—). Use a regular hyphen (-) instead.
- Never use generic AI filler, robotic phrasing, or bloated language.
- Never guarantee rankings, verification, leads, or outcomes.
- Write like a real strategist advising a real person — plain English, specific, short, actionable.
- Every action item must reference THIS advisor's actual data. No generic advice.
- NEVER flag missing or incomplete NMLS numbers as an action item or conflict. NMLS compliance is tracked separately and is not part of this audit.

${
  napForm
    ? `The attached document is this advisor's NAP (Name, Address, Phone) form. This is the CANONICAL SOURCE OF TRUTH. Extract every field precisely as written on the form. Every discrepancy found on any platform must be compared against these canonical values.`
    : `No NAP form uploaded. Use this profile data as the canonical NAP:\n${fallbackNap}`
}

KNOWN ONLINE PROFILES ON RECORD (these are the ONLY platforms to audit):
${knownProfiles}

YOUR TASK:
Audit each of the known profiles listed above against the canonical NAP. You are NOT recommending new platforms — only review what already exists. Your job is to identify what needs to be UPDATED or FIXED on the platforms they already have, so every channel matches the canonical NAP exactly.

IMPORTANT SCOPE RULES:
- Only create action items for platforms listed in KNOWN ONLINE PROFILES.
- Do NOT suggest creating new accounts (no BBB, Experience.com, Bing Places, Apple Maps, or any platform not already listed).
- Do NOT tell them to set up platforms they don't have. If a platform isn't in the known list, ignore it entirely.
- Base all findings on the canonical NAP vs. what you know about the listed profile URLs.

WHAT TO CHECK ON EACH KNOWN PROFILE:
1. NAP accuracy — does the name, address, phone, email, and title on that profile match the canonical NAP exactly?
2. Old employer branding — is any prior company name (Cornerstone, Academy, loanDepot, etc.) still showing?
3. Name format — is "NEO" fully capitalized everywhere it appears? Is the advisor's name spelled exactly as canonical?
4. Title/category — does the job title or business category match canonical?
5. Duplicate profiles — are there multiple accounts for the same platform? (Flag the one to remove)
6. Incomplete profile data — missing bio, photos, or hours on a profile they already have (do NOT flag NMLS — it is tracked separately)
7. Website — local keywords, service area language, schema markup, mobile-friendliness
8. AI search readiness — canonical entity signals, structured data, FAQ content

SCORING (conservative — only award points with real evidence from the known profiles):
- Listings Health /30: NAP accuracy across their known directory/listing profiles
- Reviews & Reputation /20: review volume, recency, platform diversity, sentiment signals from known profiles
- Website Local Relevance /20: local keywords, service area pages, schema, mobile-friendliness on their website
- Brand & Entity Consistency /15: identical name/title/photo/employer on all known platforms, no legacy branding
- AI Search Readiness /15: canonical entity signals, structured data, FAQ content

ACTION ITEMS — FORMAT RULES (critical):
- Numbered 1 through N, most urgent first
- SHORT — one bold key term, then 1-2 tight sentences max. No paragraphs.
- Only reference platforms from the known list above
- Include the profile URL in the "url" field — it will render as a CLICK HERE button. Do NOT paste the URL inside the action text.
- Format: "Bold Key Term: One or two specific sentences telling them exactly what to fix and what the correct value should be."
- Example good: "Update Facebook Title: Your Facebook page still shows 'Loan Officer at Cornerstone.' Change it to 'Mortgage Advisor at NEO Home Loans.'"
- Example bad: "You should consider updating your social profiles to reflect your current employer..." (too vague, no specifics)

CONFLICTS — FORMAT RULES:
- Only list conflicts found on the known profiles
- Group by type: "Main conflict 1: Title inconsistency — [Platform] shows '[wrong value]' but canonical title is '[correct value]'"
- Each is one specific factual statement. No guessing — only flag what you can determine from the profile URLs and NAP data provided.

CANONICAL BLOCK — FORMAT RULES:
- Write the exact NAP text the advisor should copy-paste into every profile bio/about section
- Multi-line, formatted for display. Include: Name, Title, Company, NMLS, Address, Phone, Website.
- Use \\n between each line.
- Example format:
  [Name]
  [Title] | NEO Home Loans
  NMLS #[number]
  [Address]
  [Phone]
  [Website]

COMPETITIVE GAP ANALYSIS:
- Advantages: things this advisor does better than typical competitors based on the profiles and data available
- Gaps: specific areas (on their existing platforms) where they fall short vs. competitor norms

CONTENT THEMES:
- List 5-8 specific recurring content topics tailored to THIS advisor's market, audience, and background
- These should be actionable content ideas they can post on their existing channels

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
  "canonicalBlock": "<Exact multi-line NAP text for this advisor to copy-paste everywhere. Include name, title, company, NMLS, address, phone, website. Use line breaks (\\n) between fields.>",
  "canonicalPublicDisplay": "<One-line version: 'Name | Title | NEO Home Loans | NMLS #XXXXX | City, State'>",
  "positioningStatement": "<1-2 sentences. What this advisor should say everywhere about who they serve and what makes them different. Plain English, not corporate-speak.>",
  "bestDifferenceLanguage": "<1 sentence. The one thing that makes this advisor genuinely stand out from other mortgage advisors in their market. Specific and real.>",
  "score": <0-100>,
  "scoreBreakdown": {
    "listingsHealth":        { "score": <0-30>, "max": 30, "notes": "<2-3 sentences of specific findings. Reference actual platforms and what was found.>" },
    "reviews":               { "score": <0-20>, "max": 20, "notes": "<2-3 sentences>" },
    "websiteLocalRelevance": { "score": <0-20>, "max": 20, "notes": "<2-3 sentences>" },
    "brandConsistency":      { "score": <0-15>, "max": 15, "notes": "<2-3 sentences. Be specific about what is inconsistent and where.>" },
    "aiSearchReadiness":     { "score": <0-15>, "max": 15, "notes": "<2-3 sentences>" }
  },
  "actionItems": [
    {
      "priority": <1 through N>,
      "platform": "<Platform name>",
      "action": "<Bold Key Term: 1-2 tight sentences. Reference actual wrong value and correct value.>",
      "url": "<direct URL to the profile or management page — omit if unknown>"
    }
  ],
  "conflicts": [
    "<Main conflict 1: Type - [Platform] shows '[wrong value]' but canonical [field] is '[correct value]'>",
    "<Main conflict 2: Type - ...>"
  ],
  "competitiveGapAnalysis": {
    "advantages": ["<Specific thing this advisor does well vs competitors in their market>"],
    "gaps": ["<Specific area where competitors are currently beating them>"]
  },
  "mainAudienceServed": "<1-2 paragraphs describing who this advisor actually serves based on their profile data. Include loan types, geography, niche markets.>",
  "whoYouAppearToServe": "<1-2 paragraphs describing the audience that comes through in their public profiles — recurring positioning themes from reviews and bios.>",
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
      "notes": "<Specific issue or empty if OK. For REMOVE: explain why. For ISSUE: what is wrong and what correct value should be.>"
    }
  ],
  "contentThemes": [
    "<Specific recurring content topic tailored to this advisor's market and audience>",
    "<Topic 2>",
    "<Topic 3>",
    "<Topic 4>",
    "<Topic 5>"
  ],
  "queryVisibility": {
    "branded": "<Assessment of branded search visibility — searches containing advisor name or NMLS. What shows up, what's clean, what's fragmented.>",
    "nonBranded": "<Assessment of non-branded local search — mortgage + city searches. What's working, where competitors dominate.>",
    "topicClusters": [
      "<Topic cluster already strong for this advisor>",
      "<Topic cluster 2>"
    ],
    "missedOpportunities": [
      "Homebuyers: <specific search queries this advisor is missing>",
      "Refinancers/homeowners: <specific refinance/homeowner queries>",
      "Referral partners: <specific referral-partner queries>"
    ],
    "serviceAreaExpansion": "<Specific cities/suburbs this advisor could expand into, with context.>"
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
