// ─── Phase 2A: Grounded Training Dataset Generator ─────────────────
// Collects real-world data from Reddit, HN, CoinGecko, then uses
// Mistral Large to produce "perfect" script outputs that become
// training examples for fine-tuning Ministral 3B.
//
// Run: source .env && npx tsx scripts/generate-dataset.ts
// Output: dataset.jsonl (HuggingFace ChatML format for Unsloth)

import * as fs from "fs";
import * as path from "path";
import { Mistral } from "@mistralai/mistralai";
import { scrapeReddit } from "../src/lib/research/reddit";
import { fetchHackerNews } from "../src/lib/research/hackernews";
import { fetchCoinGeckoTrending } from "../src/lib/research/coingecko";
import { scoreAndDedup } from "../src/lib/research/scorer";
import {
  getSubredditsForNiche,
  getSourcesForNiche,
} from "../src/lib/research/niche-config";
import type { ResearchItem, ScoredItem } from "../src/lib/research/types";

// ─── Load .env if not already set ──────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}
loadEnv();

// ─── Configuration ──────────────────────────────────────────────────

const MODEL = "mistral-large-latest";
const OUTPUT_FILE = path.resolve(__dirname, "../dataset.jsonl");

// 5 niches as specified in the plan
// "ai" maps to "tech" collectors, "finance" maps to "crypto" collectors
const NICHES = ["crypto", "tech", "memes", "ai", "finance"] as const;
type Niche = (typeof NICHES)[number];

// Map niches without dedicated collectors to ones that do
const NICHE_COLLECTOR_MAP: Record<Niche, string> = {
  crypto: "crypto",
  tech: "tech",
  memes: "memes",
  ai: "tech",       // AI shares tech's research sources
  finance: "crypto", // Finance shares crypto's research sources
};

// 4 vibes x 2 aggressiveness levels = 8 persona combos
const VIBES = ["savage", "chill", "professional", "edgy"] as const;
type Vibe = (typeof VIBES)[number];

const AGGRESSIVENESS_MAP: Record<Vibe, "safe" | "spicy"> = {
  savage: "spicy",
  chill: "safe",
  professional: "safe",
  edgy: "spicy",
};

// Roles that vary the persona slightly
const ROLES: Record<Vibe, string> = {
  savage: "commentator",
  chill: "educator",
  professional: "analyst",
  edgy: "provocateur",
};

// ─── The system prompt for the fine-tuned model ─────────────────────
// This is the FIXED system prompt that will be baked into every training
// example. The fine-tuned Ministral 3B will always receive this.

function buildSystemPrompt(niche: string, vibe: Vibe): string {
  const aggressiveness = AGGRESSIVENESS_MAP[vibe];
  const role = ROLES[vibe];

  return `You are MistralFluence ScriptWriter, a specialized AI that writes viral short-form video scripts for social media influencers.

CHARACTER PROFILE:
- Niche: ${niche}
- Vibe: ${vibe}
- Role: ${role}
- Language: English
- Aggressiveness: ${aggressiveness}

YOUR TASK:
Given real-time trending data and a specific topic, write exactly 3 script variants for a 22-second vertical video (Instagram Reels / TikTok).

OUTPUT FORMAT (strict JSON):
{
  "scripts": [
    {
      "variant": "hot-take",
      "title": "Short title (max 8 words)",
      "hook": "Opening line (0-2 seconds, must stop the scroll)",
      "body": "Main content (2-18 seconds, one core message with proof)",
      "cta": "Call-to-action (18-22 seconds, drive engagement)"
    },
    {
      "variant": "breakdown",
      "title": "...",
      "hook": "A surprising fact or stat opening",
      "body": "Step-by-step explanation of the topic",
      "cta": "Share prompt CTA"
    },
    {
      "variant": "story",
      "title": "...",
      "hook": "\"I just saw...\" or \"This happened today...\" opening",
      "body": "Narrative arc with personal reaction",
      "cta": "Question CTA to drive comments"
    }
  ]
}

RULES:
- Each script must be speakable in under 22 seconds total
- NO filler phrases, NO "in this video", NO "today we're going to"
- Every sentence must earn its place — remove anything skippable
- Hooks must create curiosity gaps or pattern interrupts
- The body should feel like insider knowledge being shared
- Match the ${vibe} energy level throughout${aggressiveness === "spicy" ? "\n- Use edgy, provocative, confrontational language. Be bold and polarizing." : "\n- Keep it informative but engaging. Be authoritative without being aggressive."}
- Return ONLY the JSON object, no markdown, no explanation`;
}

// ─── Build the user prompt from real research data ──────────────────

function buildUserPrompt(
  niche: string,
  topic: string,
  researchContext: string
): string {
  return `Niche: ${niche}
Topic: ${topic}

REAL-TIME RESEARCH DATA:
${researchContext}

Write 3 script variants (hot-take, breakdown, story) for the topic above, grounded in the real data provided.`;
}

// ─── Format research items into context string ──────────────────────

function formatResearchContext(items: ScoredItem[], maxItems: number = 8): string {
  return items
    .slice(0, maxItems)
    .map((item, i) => {
      const parts = [
        `${i + 1}. "${item.title}"`,
        `   Source: ${item.source}${item.subreddit ? ` (r/${item.subreddit})` : ""}`,
        `   Engagement: Score ${item.score} | Comments: ${item.comments} | Ranked: ${item.finalScore}/100`,
      ];
      if (item.raw.price_change_24h_pct !== undefined) {
        parts.push(`   Price Change 24h: ${item.raw.price_change_24h_pct}%`);
      }
      if (item.raw.content_snippet) {
        parts.push(`   Context: ${String(item.raw.content_snippet).slice(0, 120)}`);
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

// ─── Generate topics from scored items ──────────────────────────────
// Instead of calling the LLM to synthesize topics (which would be circular),
// we derive topics directly from the research data — these are the raw
// headlines and trends that the model will learn to write scripts about.

function deriveTopicsFromResearch(
  niche: string,
  scored: ScoredItem[],
  count: number = 10
): string[] {
  // Take top items by final score and create topic strings
  const topics: string[] = [];
  const seen = new Set<string>();

  for (const item of scored) {
    if (topics.length >= count) break;

    // Clean up title into a topic
    let topic = item.title;

    // Skip if too similar to an existing topic (simple check)
    const normalized = topic.toLowerCase().slice(0, 30);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    // For coingecko items, use the generated title as-is (already topic-like)
    // For reddit/HN, the title IS the topic
    topics.push(topic);
  }

  // If we don't have enough from research, add some from the trend bank
  const FALLBACK_TOPICS: Record<string, string[]> = {
    crypto: [
      "Bitcoin ETF institutional flows this week",
      "Why altcoin season signals are flashing",
      "DeFi yields vs TradFi: the real numbers",
      "Meme coins: gambling or alpha?",
      "Layer 2 wars: who's actually winning",
    ],
    tech: [
      "AI coding assistants are changing hiring",
      "The hidden cost of microservices",
      "Why developers are leaving big tech",
      "Open source vs proprietary AI models",
      "The framework fatigue is real",
    ],
    memes: [
      "Corporate cringe is peak content now",
      "The TikTok algorithm is broken again",
      "Why reaction content outperforms originals",
      "Gen Z workplace humor decoded",
      "Internet culture moves at light speed",
    ],
    ai: [
      "GPT vs Claude vs Gemini: honest comparison",
      "AI agents are coming for your workflow",
      "Fine-tuning vs prompting: when to use each",
      "The AI bubble debate is missing the point",
      "Local AI models on consumer hardware",
    ],
    finance: [
      "Rate cuts coming: what it means for you",
      "Index funds are not as safe as you think",
      "The side hustle economy is changing",
      "Why traditional finance is watching crypto",
      "Money psychology mistakes to avoid",
    ],
  };

  const fallbacks = FALLBACK_TOPICS[niche] || FALLBACK_TOPICS["memes"];
  for (const fb of fallbacks) {
    if (topics.length >= count) break;
    const normalized = fb.toLowerCase().slice(0, 30);
    if (!seen.has(normalized)) {
      topics.push(fb);
      seen.add(normalized);
    }
  }

  return topics.slice(0, count);
}

// ─── Mistral API call for script generation ─────────────────────────

let mistralClient: Mistral | null = null;

function getMistral(): Mistral {
  if (!mistralClient) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY not set. Run: source .env && npx tsx scripts/generate-dataset.ts");
    }
    mistralClient = new Mistral({ apiKey });
  }
  return mistralClient;
}

async function generateScriptsForTraining(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const mistral = getMistral();

  try {
    const completion = await mistral.chat.complete({
      model: MODEL,
      temperature: 0.8,
      responseFormat: { type: "json_object" },
      maxTokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return null;
    }

    // Validate it's parseable JSON with the right structure
    const parsed = JSON.parse(content);
    if (!parsed.scripts || !Array.isArray(parsed.scripts) || parsed.scripts.length < 3) {
      console.warn("  [warn] Response missing 3 scripts, skipping");
      return null;
    }

    // Validate each script has the required fields
    for (const s of parsed.scripts) {
      if (!s.variant || !s.title || !s.hook || !s.body || !s.cta) {
        console.warn("  [warn] Script missing required fields, skipping");
        return null;
      }
    }

    // Return the raw JSON string (normalized via re-stringify)
    return JSON.stringify(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  [warn] Mistral call failed: ${msg}`);
    return null;
  }
}

// ─── Rate limiter ───────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main Pipeline ──────────────────────────────────────────────────

interface DatasetEntry {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

async function collectResearchForNiche(collectorNiche: string): Promise<ScoredItem[]> {
  console.log(`\n  Collecting from: ${getSourcesForNiche(collectorNiche).join(", ")}`);
  const sources = getSourcesForNiche(collectorNiche);
  const allItems: ResearchItem[] = [];

  const promises: Promise<ResearchItem[]>[] = [];

  if (sources.includes("reddit")) {
    promises.push(
      scrapeReddit(getSubredditsForNiche(collectorNiche).slice(0, 3))
        .catch((err) => {
          console.warn(`  [warn] Reddit failed: ${err instanceof Error ? err.message : err}`);
          return [] as ResearchItem[];
        })
    );
  }

  if (sources.includes("hackernews")) {
    promises.push(
      fetchHackerNews()
        .catch((err) => {
          console.warn(`  [warn] HN failed: ${err instanceof Error ? err.message : err}`);
          return [] as ResearchItem[];
        })
    );
  }

  if (sources.includes("coingecko")) {
    promises.push(
      fetchCoinGeckoTrending()
        .catch((err) => {
          console.warn(`  [warn] CoinGecko failed: ${err instanceof Error ? err.message : err}`);
          return [] as ResearchItem[];
        })
    );
  }

  // Skip Tavily to conserve API credits (free tier is 1K/month)
  // The Reddit + HN + CoinGecko data is sufficient for grounding

  const results = await Promise.all(promises);
  for (const items of results) {
    allItems.push(...items);
  }

  console.log(`  Collected ${allItems.length} raw items`);

  const scored = scoreAndDedup(allItems);
  console.log(`  ${scored.length} items after dedup/scoring`);

  return scored;
}

async function main() {
  console.log("================================================================");
  console.log("  MistralFluence Dataset Generator (Phase 2A)");
  console.log("  Grounded Distillation: Real Data -> Mistral Large -> JSONL");
  console.log("================================================================\n");

  if (!process.env.MISTRAL_API_KEY) {
    console.error("ERROR: MISTRAL_API_KEY not set.");
    console.error("Run: source .env && npx tsx scripts/generate-dataset.ts");
    process.exit(1);
  }

  const startTime = Date.now();
  const entries: DatasetEntry[] = [];
  let apiCalls = 0;
  let failures = 0;

  // ── Step 1: Collect research data per unique collector niche ──
  console.log("Step 1: Collecting real-world research data...\n");

  const uniqueCollectorNiches = [...new Set(Object.values(NICHE_COLLECTOR_MAP))];
  const researchByCollectorNiche = new Map<string, ScoredItem[]>();

  for (const collectorNiche of uniqueCollectorNiches) {
    console.log(`[${collectorNiche}] Fetching research data...`);
    const scored = await collectResearchForNiche(collectorNiche);
    researchByCollectorNiche.set(collectorNiche, scored);
    // Pause between niches to be polite to APIs
    await sleep(1000);
  }

  // ── Step 2: Generate training examples ──
  console.log("\n\nStep 2: Generating training examples via Mistral Large...\n");

  for (const niche of NICHES) {
    const collectorNiche = NICHE_COLLECTOR_MAP[niche];
    const scored = researchByCollectorNiche.get(collectorNiche) || [];

    if (scored.length === 0) {
      console.warn(`[${niche}] No research data, using fallback topics only`);
    }

    // Derive 8-10 topics from the research data
    const topics = deriveTopicsFromResearch(niche, scored, 10);
    console.log(`[${niche}] Derived ${topics.length} topics`);

    // Build the shared research context for this niche
    const researchContext = scored.length > 0
      ? formatResearchContext(scored, 10)
      : `No live research data available. Generate scripts based on general ${niche} knowledge.`;

    // For each topic x vibe combination, generate a training example
    for (const topic of topics) {
      for (const vibe of VIBES) {
        const systemPrompt = buildSystemPrompt(niche, vibe);
        const userPrompt = buildUserPrompt(niche, topic, researchContext);

        console.log(`  [${niche}/${vibe}] "${topic.slice(0, 50)}..." `);
        apiCalls++;

        const assistantResponse = await generateScriptsForTraining(systemPrompt, userPrompt);

        if (assistantResponse) {
          const entry: DatasetEntry = {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
              { role: "assistant", content: assistantResponse },
            ],
          };
          entries.push(entry);
          fs.appendFileSync(OUTPUT_FILE, JSON.stringify(entry) + "\n", "utf-8");
          process.stdout.write(`    -> OK (${entries.length} total)\n`);
        } else {
          failures++;
          process.stdout.write(`    -> FAILED\n`);
        }

        // Rate limit: ~1 request per second to stay safe
        await sleep(1200);
      }
    }
  }

  // ── Step 3: Summary ──
  console.log(`\n\nDataset written to ${OUTPUT_FILE}...\n`);
  const durationMin = ((Date.now() - startTime) / 60000).toFixed(1);

  // ── Summary ──
  console.log("================================================================");
  console.log("  DATASET GENERATION COMPLETE");
  console.log("================================================================");
  console.log(`  Niches processed:     ${NICHES.length} (${NICHES.join(", ")})`);
  console.log(`  Vibes per topic:      ${VIBES.length} (${VIBES.join(", ")})`);
  console.log(`  API calls made:       ${apiCalls}`);
  console.log(`  Successful examples:  ${entries.length}`);
  console.log(`  Failed calls:         ${failures}`);
  console.log(`  Success rate:         ${((entries.length / apiCalls) * 100).toFixed(1)}%`);
  console.log(`  Output file:          ${OUTPUT_FILE}`);
  console.log(`  Duration:             ${durationMin} min`);
  console.log("================================================================\n");

  // Validate a random sample
  if (entries.length > 0) {
    console.log("Sample entry (first):\n");
    const sample = entries[0];
    console.log(`  System prompt: ${sample.messages[0].content.slice(0, 100)}...`);
    console.log(`  User prompt:   ${sample.messages[1].content.slice(0, 100)}...`);
    const assistantParsed = JSON.parse(sample.messages[2].content);
    console.log(`  Assistant scripts: ${assistantParsed.scripts.length} variants`);
    for (const s of assistantParsed.scripts) {
      console.log(`    - [${s.variant}] "${s.title}"`);
      console.log(`      Hook: "${s.hook.slice(0, 60)}..."`);
    }
  }

  if (entries.length < 10) {
    console.warn("\nWARNING: Less than 10 examples generated. Check API errors above.");
    console.warn("You may need to re-run or check your MISTRAL_API_KEY.\n");
  }
}

main().catch((err) => {
  console.error("\nDataset generation failed:", err);
  process.exit(1);
});
