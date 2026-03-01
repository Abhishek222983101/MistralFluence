import type { VideoModel } from "@/lib/monadfluence/types";

/**
 * Pricing in micro-USDC (6 decimals).
 * LTX-2-fast at 1080p: $0.04/sec
 * Example: 240000n = $0.24
 */
const m = (usd: number): bigint => BigInt(Math.round(usd * 1e6));

export const VIDEO_PRICING: Record<VideoModel, Record<number, bigint>> = {
  ltx: {
    // LTX-2-fast at 1080p: $0.04/sec
    6: m(0.24),
    10: m(0.4),
  },
};

/**
 * Returns the cost in micro-USDC (6 decimals) as a number for backward compat.
 */
export function getVideoCost(model: string, duration: number): number {
  return Number(getVideoCostAtomic(model, duration));
}

/** Returns cost as bigint micro-USDC (6 decimals). */
export function getVideoCostAtomic(model: string, duration: number): bigint {
  const modelPricing = VIDEO_PRICING[model as VideoModel] ?? VIDEO_PRICING["ltx"];
  return modelPricing[duration] ?? modelPricing[6] ?? m(0.24);
}

export function getTreasuryWallet(): string {
  return (process.env.TREASURY_WALLET ?? "").trim();
}

export const CAPTION_COST_ATOMIC = m(0.01);

export const FREE_CREDIT_AMOUNT = m(0.15);
