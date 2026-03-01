// ─── Scoring Engine ───────────────────────────────────────────────
// Deduplicates, normalizes, and ranks ResearchItem[] from all sources.
// Produces ScoredItem[] sorted by finalScore (highest first).

import type { ResearchItem, ScoredItem } from "./types";

// ─── Configuration ─────────────────────────────────────────────────

/** How similar titles must be to be considered duplicates (0-1, higher = stricter) */
const DEDUP_SIMILARITY_THRESHOLD = 0.65;

/** Weights for final score calculation */
const WEIGHTS = {
  normalizedScore: 0.50,  // base engagement (upvotes, HN points, etc.)
  recencyBonus: 0.20,     // fresher content = higher score
  engagementSignal: 0.30, // comment-to-score ratio signals debate potential
};

/** How many hours back to give full recency bonus */
const RECENCY_WINDOW_HOURS = 24;

// ─── Public API ────────────────────────────────────────────────────

/**
 * Full scoring pipeline: dedup → normalize → rank.
 * Returns items sorted by finalScore descending.
 */
export function scoreAndDedup(items: ResearchItem[]): ScoredItem[] {
  if (items.length === 0) return [];

  // 1. Dedup by title similarity
  const deduped = deduplicateByTitle(items);

  // 2. Normalize scores across sources (0-100)
  const normalized = normalizeScores(deduped);

  // 3. Calculate recency bonus
  const withRecency = addRecencyBonus(normalized);

  // 4. Calculate engagement signal (comment-to-score ratio)
  const withEngagement = addEngagementSignal(withRecency);

  // 5. Calculate final score and sort
  const scored = withEngagement.map((item) => ({
    ...item,
    finalScore: Math.round(
      item.normalizedScore * WEIGHTS.normalizedScore +
      item.recencyBonus * WEIGHTS.recencyBonus +
      item.engagementSignal * WEIGHTS.engagementSignal
    ),
  }));

  scored.sort((a, b) => b.finalScore - a.finalScore);

  return scored;
}

// ─── Deduplication ─────────────────────────────────────────────────

/**
 * Remove near-duplicate titles using Levenshtein distance.
 * When duplicates are found, keep the one with the higher score.
 */
function deduplicateByTitle(items: ResearchItem[]): ResearchItem[] {
  // Sort by score descending so we keep the highest-scored version
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const kept: ResearchItem[] = [];

  for (const item of sorted) {
    const isDuplicate = kept.some(
      (existing) => titleSimilarity(existing.title, item.title) > DEDUP_SIMILARITY_THRESHOLD
    );
    if (!isDuplicate) {
      kept.push(item);
    }
  }

  return kept;
}

/**
 * Title similarity using normalized Levenshtein distance.
 * Returns 0 (completely different) to 1 (identical).
 */
function titleSimilarity(a: string, b: string): number {
  const cleanA = cleanTitle(a);
  const cleanB = cleanTitle(b);

  if (cleanA === cleanB) return 1;

  const maxLen = Math.max(cleanA.length, cleanB.length);
  if (maxLen === 0) return 1;

  const distance = levenshtein(cleanA, cleanB);
  return 1 - distance / maxLen;
}

/**
 * Clean title for comparison: lowercase, remove punctuation, collapse whitespace.
 */
function cleanTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance between two strings.
 * Uses O(min(m,n)) space via single-row optimization.
 */
function levenshtein(a: string, b: string): number {
  if (a.length > b.length) [a, b] = [b, a];

  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: m + 1 }, (_, i) => i);

  for (let j = 1; j <= n; j++) {
    const curr = [j];
    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1,     // insertion
        prev[i] + 1,         // deletion
        prev[i - 1] + cost   // substitution
      );
    }
    prev = curr;
  }

  return prev[m];
}

// ─── Score Normalization ───────────────────────────────────────────

/**
 * Normalize raw scores to 0-100 within each source.
 * Different sources have wildly different scales:
 * - Reddit: 0 to 50,000+ upvotes
 * - HackerNews: 0 to 2,000+ points
 * - CoinGecko: 100-700 (our synthetic scale)
 * - Tavily: 0-100 (already normalized)
 */
function normalizeScores(items: ResearchItem[]): ScoredItem[] {
  // Group by source
  const bySource = new Map<string, ResearchItem[]>();
  for (const item of items) {
    const group = bySource.get(item.source) || [];
    group.push(item);
    bySource.set(item.source, group);
  }

  const result: ScoredItem[] = [];

  const sourceGroups = Array.from(bySource.values());
  for (const group of sourceGroups) {
    const scores = group.map((i) => i.score);
    const maxScore = Math.max(...scores, 1); // avoid division by zero
    const minScore = Math.min(...scores, 0);
    const range = maxScore - minScore || 1;

    for (const item of group) {
      result.push({
        ...item,
        normalizedScore: Math.round(((item.score - minScore) / range) * 100),
        recencyBonus: 0,
        engagementSignal: 0,
        finalScore: 0,
      });
    }
  }

  return result;
}

// ─── Recency Bonus ─────────────────────────────────────────────────

/**
 * Add recency bonus: items within last RECENCY_WINDOW_HOURS get up to 100 points.
 * Linear decay: 0h = 100, 24h = 0.
 */
function addRecencyBonus(items: ScoredItem[]): ScoredItem[] {
  const now = Date.now();
  const windowMs = RECENCY_WINDOW_HOURS * 60 * 60 * 1000;

  return items.map((item) => {
    const itemTime = new Date(item.createdAt).getTime();
    const ageMs = now - itemTime;
    const recencyBonus = Math.max(0, Math.round(100 * (1 - ageMs / windowMs)));
    return { ...item, recencyBonus };
  });
}

// ─── Engagement Signal ─────────────────────────────────────────────

/**
 * Engagement signal based on comment-to-score ratio.
 * High comments relative to score = controversial/engaging topic.
 * Normalized to 0-100.
 */
function addEngagementSignal(items: ScoredItem[]): ScoredItem[] {
  const ratios = items
    .filter((i) => i.score > 0 && i.comments > 0)
    .map((i) => i.comments / i.score);

  const maxRatio = Math.max(...ratios, 0.01);

  return items.map((item) => {
    if (item.score === 0 || item.comments === 0) {
      return { ...item, engagementSignal: 0 };
    }
    const ratio = item.comments / item.score;
    const engagementSignal = Math.round((ratio / maxRatio) * 100);
    return { ...item, engagementSignal: Math.min(100, engagementSignal) };
  });
}
