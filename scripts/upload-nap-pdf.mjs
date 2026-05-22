/**
 * upload-nap-pdf.mjs
 * Reads a NAP form PDF, identifies the advisor by name/NMLS/email,
 * uploads to Supabase Storage, and links it to the correct advisor record.
 *
 * Usage: node scripts/upload-nap-pdf.mjs /path/to/nap-form.pdf
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

// ── Config from .env ─────────────────────────────────────────────────────────
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BUCKET            = "advisor-files";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db       = new PrismaClient();
const ai       = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── Main ──────────────────────────────────────────────────────────────────────
const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/upload-nap-pdf.mjs /path/to/nap-form.pdf");
  process.exit(1);
}

const absPath = path.resolve(filePath);
if (!fs.existsSync(absPath)) {
  console.error("File not found:", absPath);
  process.exit(1);
}

console.log("\n📄 Reading PDF:", absPath);
const fileBuffer = fs.readFileSync(absPath);
const base64     = fileBuffer.toString("base64");
const ext        = path.extname(absPath).slice(1).toLowerCase() || "pdf";
const mimeType   = ext === "pdf" ? "application/pdf" : `image/${ext}`;

// ── Step 1: Use Claude to extract advisor identity from the form ───────────────
console.log("🤖 Identifying advisor from form...");

const message = await ai.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 512,
  messages: [{
    role: "user",
    content: [
      {
        type: mimeType === "application/pdf" ? "document" : "image",
        source: { type: "base64", media_type: mimeType, data: base64 },
      },
      {
        type: "text",
        text: `Extract the advisor identity from this NAP form. Return ONLY raw JSON with no markdown:
{
  "name": "<full advisor name exactly as written>",
  "nmlsNumber": "<NMLS number digits only>",
  "email": "<email address if present, else empty string>"
}`,
      },
    ],
  }],
});

const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
let identity;
try {
  const jsonStr = raw.replace(/```(?:json)?/g, "").trim();
  identity = JSON.parse(jsonStr);
} catch {
  console.error("Could not parse Claude response:", raw);
  process.exit(1);
}

console.log(`✅ Identified: ${identity.name} | NMLS: ${identity.nmlsNumber} | Email: ${identity.email}`);

// ── Step 2: Find the advisor in the database ──────────────────────────────────
console.log("🔍 Looking up advisor in database...");

let advisor = null;

// Try email first
if (identity.email) {
  advisor = await db.advisor.findFirst({
    where: { email: { equals: identity.email, mode: "insensitive" } },
  });
}

// Try NMLS
if (!advisor && identity.nmlsNumber) {
  advisor = await db.advisor.findFirst({
    where: { nmlsNumber: { contains: identity.nmlsNumber, mode: "insensitive" } },
  });
}

// Try name
if (!advisor && identity.name) {
  advisor = await db.advisor.findFirst({
    where: { name: { contains: identity.name.split(" ")[0], mode: "insensitive" } },
  });
  // Narrow down if multiple
  if (advisor) {
    const all = await db.advisor.findMany({
      where: { name: { contains: identity.name.split(" ")[0], mode: "insensitive" } },
    });
    if (all.length > 1) {
      // Pick best match by last name too
      const lastWord = identity.name.split(" ").pop();
      const better = all.find(a => a.name.toLowerCase().includes(lastWord.toLowerCase()));
      if (better) advisor = better;
    }
  }
}

if (!advisor) {
  console.error(`❌ No advisor found for: ${identity.name} / ${identity.nmlsNumber} / ${identity.email}`);
  console.log("\nAll advisors in the database:");
  const all = await db.advisor.findMany({ select: { name: true, nmlsNumber: true, email: true } });
  all.forEach(a => console.log(`  - ${a.name} | NMLS: ${a.nmlsNumber} | ${a.email}`));
  process.exit(1);
}

console.log(`✅ Matched advisor: ${advisor.name} (ID: ${advisor.id})`);

// ── Step 3: Upload PDF to Supabase Storage ────────────────────────────────────
console.log("☁️  Uploading to Supabase Storage...");

const storagePath = `${advisor.id}/nap-${Date.now()}.${ext}`;
const { error: uploadError } = await supabase.storage
  .from(BUCKET)
  .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: true });

if (uploadError) {
  console.error("❌ Upload failed:", uploadError.message);
  process.exit(1);
}

const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
console.log("✅ Uploaded:", publicUrl);

// ── Step 4: Update advisor napFormUrl in the database ─────────────────────────
await db.advisor.update({
  where: { id: advisor.id },
  data: { napFormUrl: publicUrl },
});

console.log(`\n🎉 Done! NAP form linked to ${advisor.name}'s profile.`);
console.log(`   URL: ${publicUrl}\n`);

await db.$disconnect();
