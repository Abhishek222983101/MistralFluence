// ─── Phase 3 Integration Test ─────────────────────────────────────
// Tests scorer with real data from collectors.
// Run: npx tsx scripts/test-scorer.ts

import { scrapeReddit } from "../src/lib/research/reddit";
import { fetchHackerNews } from "../src/lib/research/hackernews";
import { fetchCoinGeckoTrending } from "../src/lib/research/coingecko";
import { getSubredditsForNiche } from "../src/lib/research/niche-config";
import { scoreAndDedup } from "../src/lib/research/scorer";
import type { ResearchItem } from "../src/lib/research/types";

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  SCORER INTEGRATION TEST (crypto niche)");
  console.log("═══════════════════════════════════════════════════════\n");

  // Collect from all crypto sources
  console.log("Fetching from collectors...");
  const [reddit, hn, coingecko] = await Promise.allSettled([
    scrapeReddit(getSubredditsForNiche("crypto")),
    fetchHackerNews(), // HN for cross-source dedup testing
    fetchCoinGeckoTrending(),
  ]);

  const allItems: ResearchItem[] = [];
  if (reddit.status === "fulfilled") allItems.push(...reddit.value);
  if (hn.status === "fulfilled") allItems.push(...hn.value);
  if (coingecko.status === "fulfilled") allItems.push(...coingecko.value);

  console.log(`\nTotal raw items: ${allItems.length}`);
  console.log(`  Reddit: ${reddit.status === "fulfilled" ? reddit.value.length : "FAILED"}`);
  console.log(`  HackerNews: ${hn.status === "fulfilled" ? hn.value.length : "FAILED"}`);
  console.log(`  CoinGecko: ${coingecko.status === "fulfilled" ? coingecko.value.length : "FAILED"}`);

  // Run scorer
  console.log("\nRunning scoreAndDedup...");
  const scored = scoreAndDedup(allItems);

  console.log(`\nAfter dedup: ${scored.length} items (removed ${allItems.length - scored.length} dupes)`);

  // Show top 15
  console.log("\n── Top 15 by Final Score ──\n");
  console.log("Rank | Score | Norm | Recency | Engage | Source     | Title");
  console.log("─────┼───────┼──────┼─────────┼────────┼────────────┼───────────────────────────────");

  for (let i = 0; i < Math.min(15, scored.length); i++) {
    const item = scored[i];
    const src = item.source.padEnd(10);
    const title = item.title.slice(0, 60);
    console.log(
      `  ${String(i + 1).padStart(2)} | ${String(item.finalScore).padStart(5)} | ${String(item.normalizedScore).padStart(4)} | ${String(item.recencyBonus).padStart(7)} | ${String(item.engagementSignal).padStart(6)} | ${src} | ${title}`
    );
  }

  // Show score distribution
  console.log("\n── Score Distribution ──\n");
  const brackets = [
    { label: "80-100", min: 80, max: 100 },
    { label: "60-79 ", min: 60, max: 79 },
    { label: "40-59 ", min: 40, max: 59 },
    { label: "20-39 ", min: 20, max: 39 },
    { label: " 0-19 ", min: 0, max: 19 },
  ];
  for (const b of brackets) {
    const count = scored.filter((i) => i.finalScore >= b.min && i.finalScore <= b.max).length;
    const bar = "█".repeat(Math.min(count, 40));
    console.log(`  ${b.label}: ${String(count).padStart(3)} ${bar}`);
  }

  console.log("\n═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
