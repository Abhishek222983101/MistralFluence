// ─── Hacker News Collector ─────────────────────────────────────────
// Uses the HN Firebase API (no auth needed).
// Fetches top stories with scores and comment counts.
// Docs: https://github.com/HackerNews/API

import type { ResearchItem } from "./types";

const HN_API = "https://hacker-news.firebaseio.com/v0";
const TOP_STORIES_LIMIT = 30;
const CONCURRENCY = 10; // fetch 10 story details at a time

interface HNItem {
  id: number;
  type: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number; // comment count
  by?: string;
  time?: number;
  dead?: boolean;
  deleted?: boolean;
}

/**
 * Fetch top HN stories with details.
 * Gets top story IDs, then fetches details in batches.
 */
export async function fetchHackerNews(): Promise<ResearchItem[]> {
  // 1. Get top story IDs
  const idsRes = await fetch(`${HN_API}/topstories.json`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!idsRes.ok) {
    throw new Error(`HN topstories returned ${idsRes.status}`);
  }

  const allIds: number[] = await idsRes.json();
  const topIds = allIds.slice(0, TOP_STORIES_LIMIT);

  // 2. Fetch story details in batches
  const items: ResearchItem[] = [];

  for (let i = 0; i < topIds.length; i += CONCURRENCY) {
    const batch = topIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((id) => fetchHNItem(id))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        items.push(result.value);
      }
    }
  }

  return items;
}

/**
 * Fetch a single HN item and normalize to ResearchItem.
 */
async function fetchHNItem(id: number): Promise<ResearchItem | null> {
  const res = await fetch(`${HN_API}/item/${id}.json`, {
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) return null;

  const item: HNItem = await res.json();

  // Skip dead, deleted, or non-story items
  if (!item || item.dead || item.deleted || !item.title) {
    return null;
  }

  return {
    id: `hn-${item.id}`,
    source: "hackernews",
    title: item.title,
    url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    score: item.score || 0,
    comments: item.descendants || 0,
    createdAt: item.time
      ? new Date(item.time * 1000).toISOString()
      : new Date().toISOString(),
    raw: {
      by: item.by,
      score: item.score,
      descendants: item.descendants,
      hn_url: `https://news.ycombinator.com/item?id=${item.id}`,
    },
  };
}
