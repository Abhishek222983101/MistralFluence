// ─── Niche Configuration ───────────────────────────────────────────
// Maps each niche to its data sources and subreddits.
// Add new niches here when expanding beyond crypto/tech/memes.

import type { ResearchSource } from "./types";

/**
 * Which collectors to run for each niche.
 * Order matters: first source is considered "primary".
 */
export const NICHE_SOURCES: Record<string, ResearchSource[]> = {
  crypto: ["reddit", "coingecko", "tavily"],
  tech:   ["reddit", "hackernews", "tavily"],
  memes:  ["reddit", "tavily"],
};

/**
 * Subreddits to scrape for each niche.
 * Max 5 per niche to stay under Reddit rate limits.
 * Ordered by relevance (most relevant first).
 */
export const NICHE_SUBREDDITS: Record<string, string[]> = {
  crypto: ["cryptocurrency", "bitcoin", "ethereum", "defi", "CryptoMarkets"],
  tech:   ["technology", "programming", "artificial", "MachineLearning", "webdev"],
  memes:  ["memes", "dankmemes", "TikTokCringe", "starterpacks"],
};

/**
 * Tavily search queries per niche.
 * These are used as enrichment after primary source collection.
 * 2-3 queries per niche to stay within free tier (1K/month).
 */
export const NICHE_TAVILY_QUERIES: Record<string, string[]> = {
  crypto: [
    "crypto trending topics today viral",
    "bitcoin ethereum news controversy today",
  ],
  tech: [
    "tech news trending today viral",
    "AI machine learning breakthrough today",
  ],
  memes: [
    "viral memes trending today internet culture",
    "tiktok trends going viral today",
  ],
};

/**
 * Default niche if the character's niche doesn't match any config.
 * Falls back to memes-style broad Reddit scraping.
 */
export const DEFAULT_NICHE = "memes";

/**
 * Get sources for a niche, falling back to default.
 */
export function getSourcesForNiche(niche: string): ResearchSource[] {
  const key = niche.toLowerCase();
  return NICHE_SOURCES[key] || NICHE_SOURCES[DEFAULT_NICHE];
}

/**
 * Get subreddits for a niche, falling back to default.
 */
export function getSubredditsForNiche(niche: string): string[] {
  const key = niche.toLowerCase();
  return NICHE_SUBREDDITS[key] || NICHE_SUBREDDITS[DEFAULT_NICHE];
}

/**
 * Get Tavily queries for a niche, falling back to default.
 */
export function getTavilyQueriesForNiche(niche: string): string[] {
  const key = niche.toLowerCase();
  return NICHE_TAVILY_QUERIES[key] || NICHE_TAVILY_QUERIES[DEFAULT_NICHE];
}
