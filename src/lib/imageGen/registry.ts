import type { ImageGenAdapter } from "./types";
import { fluxSchnellAdapter } from "./flux-schnell";
import { fluxDevAdapter } from "./flux-dev";
import { fluxDevAdvancedAdapter } from "./flux-dev-advanced";
import { midjourneyAdapter } from "./midjourney";

const adapters: ImageGenAdapter[] = [
  fluxSchnellAdapter,
  fluxDevAdapter,
  fluxDevAdvancedAdapter,
  midjourneyAdapter,
];

export function getImageAdapter(model?: string): ImageGenAdapter {
  const target = model ?? "flux-dev";
  const adapter = adapters.find((a) => a.model === target);
  if (!adapter) {
    throw new Error(
      `Unsupported image generation model: ${target}. Supported: ${adapters.map((a) => a.model).join(", ")}`,
    );
  }
  return adapter;
}

export function supportedImageModels(): string[] {
  return adapters.map((a) => a.model);
}
