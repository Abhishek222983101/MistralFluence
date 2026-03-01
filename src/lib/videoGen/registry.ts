import type { VideoGenAdapter } from "./types";
import { ltxAdapter } from "./ltx";

const adapters: VideoGenAdapter[] = [ltxAdapter];

/**
 * Get the video generation adapter. Only LTX-2 is supported.
 */
export function getVideoAdapter(model?: string): VideoGenAdapter {
  if (!model || model === "ltx") return ltxAdapter;
  const adapter = adapters.find((a) => a.model === model);
  if (!adapter) {
    throw new Error(`Unsupported video generation model: ${model}. Supported: ltx`);
  }
  return adapter;
}

export function supportedVideoModels(): string[] {
  return adapters.map((a) => a.model);
}
