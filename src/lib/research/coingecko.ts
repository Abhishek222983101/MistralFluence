// ─── CoinGecko Collector ──────────────────────────────────────────
// Uses CoinGecko /search/trending endpoint (free, no auth needed).
// Returns trending coins as ResearchItem[] for crypto niche.
// Free tier: 10-30 calls/min, no API key required for this endpoint.

import type { ResearchItem } from "./types";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

interface CoinGeckoTrendingCoin {
  item: {
    id: string;
    coin_id: number;
    name: string;
    symbol: string;
    market_cap_rank: number | null;
    thumb: string;
    small: string;
    large: string;
    slug: string;
    price_btc: number;
    score: number; // 0-based rank (0 = most trending)
    data?: {
      price: string;
      price_change_percentage_24h?: Record<string, number>;
      market_cap?: string;
      total_volume?: string;
    };
  };
}

interface CoinGeckoTrendingResponse {
  coins: CoinGeckoTrendingCoin[];
  // Also has nfts and categories but we skip those for now
}

/**
 * Fetch trending coins from CoinGecko.
 * Converts each trending coin into a topic-style ResearchItem.
 */
export async function fetchCoinGeckoTrending(): Promise<ResearchItem[]> {
  const res = await fetch(`${COINGECKO_API}/search/trending`, {
    headers: {
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`CoinGecko trending returned ${res.status}: ${res.statusText}`);
  }

  const data: CoinGeckoTrendingResponse = await res.json();

  return data.coins.map((coin): ResearchItem => {
    const item = coin.item;
    const priceChange = item.data?.price_change_percentage_24h?.usd;
    const priceStr = item.data?.price || "unknown";

    // Build a topic-style title from the trending coin
    let title: string;
    if (priceChange !== undefined && Math.abs(priceChange) > 5) {
      const direction = priceChange > 0 ? "surging" : "dumping";
      title = `${item.name} (${item.symbol.toUpperCase()}) is ${direction} ${Math.abs(priceChange).toFixed(1)}% — why it's trending`;
    } else {
      title = `${item.name} (${item.symbol.toUpperCase()}) is trending on CoinGecko — what's driving the buzz`;
    }

    // Invert the score: CoinGecko score 0 = most trending, so we flip it
    // Max 7 trending coins, so score range is 0-6 → we make it 700-100
    const engagementScore = Math.max(100, 700 - item.score * 100);

    return {
      id: `coingecko-${item.id}`,
      source: "coingecko",
      title,
      url: `https://www.coingecko.com/en/coins/${item.slug || item.id}`,
      score: engagementScore,
      comments: 0, // CoinGecko doesn't have comments
      createdAt: new Date().toISOString(), // trending = now
      raw: {
        name: item.name,
        symbol: item.symbol,
        market_cap_rank: item.market_cap_rank,
        price: priceStr,
        price_change_24h_pct: priceChange,
        market_cap: item.data?.market_cap,
        total_volume: item.data?.total_volume,
        coingecko_score: item.score,
      },
    };
  });
}
