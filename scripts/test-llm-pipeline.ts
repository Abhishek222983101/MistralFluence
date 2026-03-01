// ─── Phase 4 Integration Test ─────────────────────────────────────
// Full pipeline test: Collectors → Scorer → LLM Synthesis → Script Gen
// Run: GROQ_API_KEY=... npx tsx scripts/test-llm-pipeline.ts

import { scrapeReddit } from "../src/lib/research/reddit";
import { fetchCoinGeckoTrending } from "../src/lib/research/coingecko";
import { getSubredditsForNiche } from "../src/lib/research/niche-config";
import { scoreAndDedup } from "../src/lib/research/scorer";
import { synthesizeTopics, generateCreativeScripts } from "../src/lib/llm";
import type { ResearchItem } from "../src/lib/research/types";
import type { CharacterProfile, ContentBrief } from "../src/lib/monadfluence/types";

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  FULL PIPELINE TEST (crypto niche → Groq LLM)");
  console.log("═══════════════════════════════════════════════════════\n");

  if (!process.env.GROQ_API_KEY) {
    console.error("ERROR: GROQ_API_KEY not set. Run with: source .env && npx tsx scripts/test-llm-pipeline.ts");
    process.exit(1);
  }

  // ── Step 1: Collect ──
  console.log("Step 1: Collecting from Reddit + CoinGecko...");
  const [reddit, coingecko] = await Promise.allSettled([
    scrapeReddit(getSubredditsForNiche("crypto").slice(0, 2)), // Only 2 subs for speed
    fetchCoinGeckoTrending(),
  ]);

  const allItems: ResearchItem[] = [];
  if (reddit.status === "fulfilled") allItems.push(...reddit.value);
  if (coingecko.status === "fulfilled") allItems.push(...coingecko.value);
  console.log(`  Collected ${allItems.length} raw items\n`);

  // ── Step 2: Score ──
  console.log("Step 2: Scoring and deduplicating...");
  const scored = scoreAndDedup(allItems);
  console.log(`  ${scored.length} items after dedup (removed ${allItems.length - scored.length})\n`);

  // ── Step 3: Synthesize Topics ──
  console.log("Step 3: Synthesizing topics via Groq...");
  const startSynth = Date.now();
  const topics = await synthesizeTopics("crypto", scored);
  const synthMs = Date.now() - startSynth;
  console.log(`  Got ${topics.length} topics in ${synthMs}ms\n`);

  for (const topic of topics) {
    console.log(`  ┌─ ${topic.title}`);
    console.log(`  │  Angle: ${topic.angle.slice(0, 80)}`);
    console.log(`  │  Hook: "${topic.hookIdea.slice(0, 80)}"`);
    console.log(`  │  Why Now: ${topic.whyNow.slice(0, 80)}`);
    console.log(`  │  Controversy: ${topic.controversyScore}/5 | Engagement: ${topic.engagementScore}/100`);
    console.log(`  │  Visual: ${topic.visualConcept.slice(0, 80)}`);
    console.log(`  └──────────────────────────────────\n`);
  }

  if (topics.length === 0) {
    console.error("ERROR: No topics synthesized. Check GROQ_API_KEY and model availability.");
    process.exit(1);
  }

  // ── Step 4: Generate Scripts ──
  console.log("Step 4: Generating scripts for top topic...");
  const mockProfile: CharacterProfile = {
    id: "test-char",
    userKey: "test-user",
    niche: "crypto",
    characterType: "human-like",
    vibe: "savage",
    role: "commentator",
    language: "English",
    aggressiveness: "spicy",
    exclusions: [],
    createdAt: new Date().toISOString(),
  };

  const mockBrief: ContentBrief = {
    id: "test-brief",
    userKey: "test-user",
    mode: "auto-trends",
    niche: "crypto",
    topic: `${topics[0].title} — ${topics[0].angle}`,
    objective: topics[0].whyNow,
    createdAt: new Date().toISOString(),
  };

  const startScripts = Date.now();
  const scripts = await generateCreativeScripts(mockProfile, mockBrief);
  const scriptMs = Date.now() - startScripts;
  console.log(`  Got ${scripts.length} scripts in ${scriptMs}ms\n`);

  for (const script of scripts) {
    console.log(`  ┌─ ${script.title}`);
    console.log(`  │  HOOK (0-2s): "${script.hook.slice(0, 100)}"`);
    console.log(`  │  BODY (2-18s): "${script.body.slice(0, 150)}..."`);
    console.log(`  │  CTA (18-22s): "${script.cta.slice(0, 100)}"`);
    console.log(`  │  Duration target: ${script.durationTargetSec}s`);
    console.log(`  └──────────────────────────────────\n`);
  }

  // ── Summary ──
  console.log("═══════════════════════════════════════════════════════");
  console.log("  PIPELINE SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Raw items collected: ${allItems.length}`);
  console.log(`  After dedup/scoring: ${scored.length}`);
  console.log(`  Topics synthesized:  ${topics.length}`);
  console.log(`  Scripts generated:   ${scripts.length}`);
  console.log(`  Synthesis latency:   ${synthMs}ms`);
  console.log(`  Script gen latency:  ${scriptMs}ms`);
  console.log(`  Total LLM time:     ${synthMs + scriptMs}ms`);
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Pipeline test failed:", err);
  process.exit(1);
});
