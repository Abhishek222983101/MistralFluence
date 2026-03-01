// ─── Research Pipeline Types ───────────────────────────────────────
// These types define the contract for the content research pipeline.
// They are consumed by: collectors, scorer, LLM synthesis, state cache, swarm.

export type ResearchSource = "reddit" | "hackernews" | "coingecko" | "tavily";

/**
 * Raw item from any source collector.
 * Every collector normalizes its output to this shape.
 */
export interface ResearchItem {
  id: string;
  source: ResearchSource;
  title: string;
  url: string;
  score: number;           // upvotes, HN points, market_cap_rank, tavily relevance
  comments: number;        // comment count (0 if unavailable)
  subreddit?: string;      // only for reddit items
  createdAt: string;       // ISO timestamp
  raw: Record<string, unknown>; // original API response for debugging
}

/**
 * LLM-synthesized topic ready for script generation.
 * Produced by synthesizeTopics() in llm.ts.
 */
export interface SynthesizedTopic {
  id: string;
  title: string;              // max 10 words, punchy
  angle: string;              // the specific take that makes this a video
  whyNow: string;             // what happened in last 24h
  hookIdea: string;           // exact opening line for 2-second scroll-stop
  controversyScore: number;   // 1-5, how debate-worthy
  engagementScore: number;    // 1-100, predicted engagement
  visualConcept: string;      // what viewer should SEE
  sources: string[];          // source IDs that contributed to this topic
}

/**
 * Cached research output per niche.
 * Stored in StateDocument.researchCache, keyed by niche.
 */
export interface ResearchCache {
  niche: string;
  timestamp: string;          // ISO when research was run
  expiresAt: string;          // ISO, 2 hours from timestamp
  rawItemCount: number;       // how many raw items were fetched
  topItems: ResearchItem[];   // top 30 scored items (for debugging/display)
  synthesizedTopics: SynthesizedTopic[]; // 5 LLM-synthesized topics
}

/**
 * Result from a single source collector.
 * Used internally by the orchestrator.
 */
export interface CollectorResult {
  source: ResearchSource;
  items: ResearchItem[];
  error?: string;
  durationMs: number;
}

/**
 * Scored item after dedup + normalization.
 * Internal to the scoring engine.
 */
export interface ScoredItem extends ResearchItem {
  normalizedScore: number;    // 0-100 after cross-source normalization
  recencyBonus: number;       // 0-20 bonus for freshness
  engagementSignal: number;   // 0-30 bonus for high comment-to-score ratio
  finalScore: number;         // normalizedScore + recencyBonus + engagementSignal
}

/**
 * Full research pipeline output.
 * Returned by runContentResearch().
 */
export interface ResearchPipelineResult {
  cache: ResearchCache;
  collectorResults: CollectorResult[];
  scoredItemCount: number;
  durationMs: number;
}
