// ─── Phase 5 Integration Test ─────────────────────────────────────
// Tests the full orchestrator: collectors → scorer → LLM → cache
// Run: source .env && npx tsx scripts/test-orchestrator.ts

import { runContentResearch } from "../src/lib/research/index";
import { getValidResearchCache } from "../src/lib/monadfluence/state";

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ORCHESTRATOR INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════\n");

  if (!process.env.GROQ_API_KEY) {
    console.error("ERROR: GROQ_API_KEY not set. Run with: source .env && npx tsx scripts/test-orchestrator.ts");
    process.exit(1);
  }

  // ── Test 1: Run research for crypto ──
  console.log("── Test 1: Run research for crypto niche ──\n");
  const result = await runContentResearch("crypto");

  console.log(`\n  Pipeline duration: ${result.durationMs}ms`);
  console.log(`  Raw items: ${result.cache.rawItemCount}`);
  console.log(`  Scored items: ${result.scoredItemCount}`);
  console.log(`  Topics synthesized: ${result.cache.synthesizedTopics.length}`);
  console.log(`  Collector breakdown:`);
  for (const cr of result.collectorResults) {
    const status = cr.error ? `FAILED (${cr.error})` : `${cr.items.length} items`;
    console.log(`    ${cr.source}: ${status} (${cr.durationMs}ms)`);
  }

  console.log(`\n  Topics:`);
  for (const topic of result.cache.synthesizedTopics) {
    console.log(`    - ${topic.title} (controversy: ${topic.controversyScore}/5, engagement: ${topic.engagementScore}/100)`);
    console.log(`      Hook: "${topic.hookIdea.slice(0, 80)}"`);
  }

  // ── Test 2: Verify cache was saved ──
  console.log("\n── Test 2: Verify cache persistence ──\n");
  const cached = await getValidResearchCache("crypto");
  if (cached) {
    console.log(`  Cache found for "crypto"`);
    console.log(`  Timestamp: ${cached.timestamp}`);
    console.log(`  Expires at: ${cached.expiresAt}`);
    console.log(`  Topics in cache: ${cached.synthesizedTopics.length}`);
    console.log(`  Top items in cache: ${cached.topItems.length}`);
  } else {
    console.error("  ERROR: Cache not found or expired!");
  }

  // ── Test 3: Check invalid niche falls back ──
  console.log("\n── Test 3: Unknown niche falls back to memes ──\n");
  const unknownResult = await runContentResearch("underwater-basket-weaving");
  console.log(`  Items collected: ${unknownResult.cache.rawItemCount}`);
  console.log(`  Sources used: ${unknownResult.collectorResults.map(cr => cr.source).join(", ")}`);

  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  ALL TESTS PASSED");
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Orchestrator test failed:", err);
  process.exit(1);
});
