// ─── Reddit Collector ──────────────────────────────────────────────
// Scrapes subreddit /hot.json via old.reddit.com (no auth needed).
// Returns normalized ResearchItem[] with engagement signals.

import type { ResearchItem } from "./types";

const USER_AGENT = "Mozilla/5.0 (compatible; Moltfluence/1.0; +https://monadfluence.com)";
const ITEMS_PER_SUBREDDIT = 25;

interface RedditPost {
  kind: string;
  data: {
    id: string;
    title: string;
    ups: number;
    num_comments: number;
    permalink: string;
    url: string;
    created_utc: number;
    subreddit: string;
    over_18: boolean;
    stickied: boolean;
    is_self: boolean;
    selftext: string;
    link_flair_text?: string;
  };
}

interface RedditListing {
  kind: string;
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

/**
 * Scrape hot posts from multiple subreddits.
 * Runs sequentially with a small delay to avoid 429s.
 */
export async function scrapeReddit(subreddits: string[]): Promise<ResearchItem[]> {
  const allItems: ResearchItem[] = [];

  for (const sub of subreddits) {
    try {
      const items = await scrapeSubreddit(sub);
      allItems.push(...items);
    } catch (err) {
      console.error(`[reddit] Failed to scrape r/${sub}:`, err instanceof Error ? err.message : err);
    }
    // Small delay between subreddits to avoid rate limiting
    if (subreddits.indexOf(sub) < subreddits.length - 1) {
      await sleep(300);
    }
  }

  return allItems;
}

/**
 * Scrape a single subreddit's hot posts.
 */
async function scrapeSubreddit(subreddit: string): Promise<ResearchItem[]> {
  const url = `https://old.reddit.com/r/${subreddit}/hot.json?limit=${ITEMS_PER_SUBREDDIT}&raw_json=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Reddit r/${subreddit} returned ${res.status}: ${res.statusText}`);
  }

  const listing: RedditListing = await res.json();

  return listing.data.children
    .filter((post) => {
      // Skip stickied/pinned posts and NSFW
      return !post.data.stickied && !post.data.over_18;
    })
    .map((post): ResearchItem => ({
      id: `reddit-${post.data.id}`,
      source: "reddit",
      title: post.data.title,
      url: `https://reddit.com${post.data.permalink}`,
      score: post.data.ups,
      comments: post.data.num_comments,
      subreddit: post.data.subreddit,
      createdAt: new Date(post.data.created_utc * 1000).toISOString(),
      raw: {
        ups: post.data.ups,
        num_comments: post.data.num_comments,
        is_self: post.data.is_self,
        link_flair_text: post.data.link_flair_text,
        external_url: post.data.is_self ? undefined : post.data.url,
      },
    }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
