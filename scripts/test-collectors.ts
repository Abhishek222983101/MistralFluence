// ─── Phase 1+2 Integration Test ───────────────────────────────────
// Tests all collectors against live APIs.
// Run: npx tsx scripts/test-collectors.ts

import { scrapeReddit } from "../src/lib/research/reddit";
import { fetchHackerNews } from "../src/lib/research/hackernews";
import { fetchCoinGeckoTrending } from "../src/lib/research/coingecko";
import { searchTavily } from "../src/lib/research/tavily";
import { getSubredditsForNiche, getTavilyQueriesForNiche } from "../src/lib/research/niche-config";

async function testCollector(
  name: string,
  fn: () => Promise<any[]>
): Promise<{ name: string; count: number; sample: any; error?: string; durationMs: number }> {
  const start = Date.now();
  try {
    const items = await fn();
    const durationMs = Date.now() - start;
    console.log(`\n✓ ${name}: ${items.length} items in ${durationMs}ms`);
    if (items.length > 0) {
      const sample = items[0];
      console.log(`  Sample: "${sample.title?.slice(0, 80)}"`);
      console.log(`  Score: ${sample.score}, Comments: ${sample.comments}, Source: ${sample.source}`);
    }
    return { name, count: items.length, sample: items[0] || null, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n✗ ${name}: FAILED in ${durationMs}ms — ${msg}`);
    return { name, count: 0, sample: null, error: msg, durationMs };
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  MONADFLUENCE COLLECTOR INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════");

  const results = [];

  // Test 1: Reddit (crypto niche — 5 subreddits)
  console.log("\n── Reddit (crypto niche) ──");
  const cryptoSubs = getSubredditsForNiche("crypto");
  console.log(`  Subreddits: ${cryptoSubs.join(", ")}`);
  results.push(await testCollector("Reddit/crypto", () => scrapeReddit(cryptoSubs)));

  // Test 2: Reddit (tech niche — 5 subreddits)
  console.log("\n── Reddit (tech niche) ──");
  const techSubs = getSubredditsForNiche("tech");
  console.log(`  Subreddits: ${techSubs.join(", ")}`);
  results.push(await testCollector("Reddit/tech", () => scrapeReddit(techSubs)));

  // Test 3: HackerNews
  console.log("\n── HackerNews ──");
  results.push(await testCollector("HackerNews", fetchHackerNews));

  // Test 4: CoinGecko
  console.log("\n── CoinGecko ──");
  results.push(await testCollector("CoinGecko", fetchCoinGeckoTrending));

  // Test 5: Tavily (crypto queries)
  console.log("\n── Tavily (crypto queries) ──");
  const cryptoQueries = getTavilyQueriesForNiche("crypto");
  console.log(`  Queries: ${cryptoQueries.join(" | ")}`);
  results.push(await testCollector("Tavily/crypto", () => searchTavily(cryptoQueries)));

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  const total = results.reduce((sum, r) => sum + r.count, 0);
  const passed = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;
  console.log(`  Total items: ${total}`);
  console.log(`  Passed: ${passed}/${results.length}`);
  console.log(`  Failed: ${failed}/${results.length}`);
  for (const r of results) {
    const status = r.error ? "✗" : "✓";
    console.log(`  ${status} ${r.name}: ${r.count} items (${r.durationMs}ms)${r.error ? ` — ${r.error}` : ""}`);
  }
  console.log("═══════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
