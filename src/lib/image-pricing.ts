/** Monad testnet USDC minimum transfer is effectively clamped to $0.01 */
const MIN_TRANSFER_USD = 0.01;

export const IMAGE_PRICING: Record<string, { usd: number; piModel: string }> = {
  // PiAPI Flux pricing reference: schnell starts at ~$0.002/image.
  "flux-schnell": { usd: 0.002, piModel: "Qubico/flux1-schnell" },
  "flux-dev": { usd: 0.015, piModel: "Qubico/flux1-dev" },
  "flux-dev-advanced": { usd: 0.02, piModel: "Qubico/flux1-dev-advanced" },
  "midjourney": { usd: 0.05, piModel: "midjourney" },
};

/** Returns USD string for x402 pricing (e.g. "$0.015") */
export function getImageCost(model: string): string {
  return `$${getImageCostNumeric(model).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}`;
}

/** Returns numeric USD cost for a model (respects minimum transfer) */
export function getImageCostNumeric(model: string): number {
  return Math.max(getImageProviderCostNumeric(model), MIN_TRANSFER_USD);
}

/** Returns PiAPI-side model cost before chain minimum transfer clamp */
export function getImageProviderCostNumeric(model: string): number {
  const pricing = IMAGE_PRICING[model] ?? IMAGE_PRICING["flux-dev"];
  return pricing.usd;
}
