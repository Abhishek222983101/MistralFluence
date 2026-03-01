// ─── Content Research Orchestrator ─────────────────────────────────
// Coordinates all collectors, scorer, and LLM synthesis into a single
// pipeline that produces cached research per niche.

import { scrapeReddit } from "./reddit";
import { fetchHackerNews } from "./hackernews";
import { fetchCoinGeckoTrending } from "./coingecko";
import { searchTavily } from "./tavily";
import { scoreAndDedup } from "./scorer";
import {
  getSourcesForNiche,
  getSubredditsForNiche,
  getTavilyQueriesForNiche,
} from "./niche-config";
import { synthesizeTopics } from "../llm";
import { saveResearchCache } from "../monadfluence/state";
import type {
  ResearchItem,
  CollectorResult,
  ResearchCache,
  ResearchPipelineResult,
} from "./types";

const CACHE_TTL_HOURS = 2;

/**
 * Run the full content research pipeline for a niche.
 *
 * 1. Run source collectors in parallel (based on niche config)
 * 2. Merge all items, dedup, and score
 * 3. Synthesize top items into 5 video-worthy topics via LLM
 * 4. Cache the result in state
 *
 * Returns the full pipeline result including timing info.
 */
export async function runContentResearch(niche: string): Promise<ResearchPipelineResult> {
  const pipelineStart = Date.now();
  const sources = getSourcesForNiche(niche);

  console.log(`[research] Starting pipeline for "${niche}" with sources: ${sources.join(", ")}`);

  // ── Step 1: Run collectors in parallel ──
  const collectorPromises: Promise<CollectorResult>[] = [];

  if (sources.includes("reddit")) {
    collectorPromises.push(runCollector("reddit", () =>
      scrapeReddit(getSubredditsForNiche(niche))
    ));
  }

  if (sources.includes("hackernews")) {
    collectorPromises.push(runCollector("hackernews", () =>
      fetchHackerNews()
    ));
  }

  if (sources.includes("coingecko")) {
    collectorPromises.push(runCollector("coingecko", () =>
      fetchCoinGeckoTrending()
    ));
  }

  if (sources.includes("tavily")) {
    collectorPromises.push(runCollector("tavily", () =>
      searchTavily(getTavilyQueriesForNiche(niche))
    ));
  }

  const collectorResults = await Promise.all(collectorPromises);

  // Merge all items
  const allItems: ResearchItem[] = [];
  for (const result of collectorResults) {
    if (result.error) {
      console.warn(`[research] ${result.source} failed: ${result.error}`);
    }
    allItems.push(...result.items);
  }

  console.log(`[research] Collected ${allItems.length} raw items from ${collectorResults.length} sources`);

  // ── Step 2: Score and dedup ──
  const scoredItems = scoreAndDedup(allItems);
  console.log(`[research] ${scoredItems.length} items after dedup (removed ${allItems.length - scoredItems.length})`);

  // ── Step 3: LLM synthesis ──
  const topics = await synthesizeTopics(niche, scoredItems);
  console.log(`[research] Synthesized ${topics.length} topics`);

  // ── Step 4: Build and save cache ──
  const now = new Date();
  const cache: ResearchCache = {
    niche,
    timestamp: now.toISOString(),
    expiresAt: new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    rawItemCount: allItems.length,
    topItems: scoredItems.slice(0, 30), // Keep top 30 for display/debugging
    synthesizedTopics: topics,
  };

  await saveResearchCache(cache);
  console.log(`[research] Cache saved for "${niche}", expires at ${cache.expiresAt}`);

  const durationMs = Date.now() - pipelineStart;
  console.log(`[research] Pipeline completed in ${durationMs}ms`);

  return {
    cache,
    collectorResults,
    scoredItemCount: scoredItems.length,
    durationMs,
  };
}

/**
 * Run a single collector with error handling and timing.
 */
async function runCollector(
  source: ResearchItem["source"],
  fn: () => Promise<ResearchItem[]>
): Promise<CollectorResult> {
  const start = Date.now();
  try {
    const items = await fn();
    return {
      source,
      items,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      source,
      items: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}
