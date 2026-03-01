// ─── Tavily Collector ─────────────────────────────────────────────
// Uses Tavily Search API for enrichment/context on trending topics.
// API key from TAVILY_API_KEY env var.
// Free tier: 1,000 API credits/month.
// Docs: https://docs.tavily.com/docs/rest-api/api-reference

import type { ResearchItem } from "./types";

const TAVILY_API = "https://api.tavily.com/search";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number; // relevance score 0-1
  published_date?: string;
}

interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  response_time: number;
}

/**
 * Search Tavily for a set of niche-specific queries.
 * Returns normalized ResearchItem[] from search results.
 */
export async function searchTavily(queries: string[]): Promise<ResearchItem[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[tavily] TAVILY_API_KEY not set, skipping");
    return [];
  }

  const allItems: ResearchItem[] = [];

  for (const query of queries) {
    try {
      const items = await runTavilySearch(apiKey, query);
      allItems.push(...items);
    } catch (err) {
      console.error(`[tavily] Search failed for "${query}":`, err instanceof Error ? err.message : err);
    }
  }

  return allItems;
}

/**
 * Run a single Tavily search query.
 */
async function runTavilySearch(apiKey: string, query: string): Promise<ResearchItem[]> {
  const res = await fetch(TAVILY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",       // "basic" = 1 credit, "advanced" = 2 credits
      max_results: 10,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Tavily returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: TavilySearchResponse = await res.json();

  return data.results.map((result, i): ResearchItem => ({
    id: `tavily-${hashString(result.url)}-${i}`,
    source: "tavily",
    title: result.title,
    url: result.url,
    // Tavily relevance score is 0-1, scale to 0-100 range
    score: Math.round(result.score * 100),
    comments: 0, // Tavily doesn't have engagement metrics
    createdAt: result.published_date || new Date().toISOString(),
    raw: {
      content_snippet: result.content.slice(0, 300),
      relevance_score: result.score,
      query,
    },
  }));
}

/**
 * Simple string hash for generating stable IDs from URLs.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
