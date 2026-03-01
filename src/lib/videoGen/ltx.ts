import type { VideoGenAdapter, VideoGenRequest, VideoGenStatus } from "./types";

const LTX_BASE = "https://api.ltx.video/v1";

/* ------------------------------------------------------------------ */
/*  Exported helpers — used by generate-video route for voice composite */
/* ------------------------------------------------------------------ */

/**
 * Generate raw MP4 bytes from LTX without uploading.
 * Exported so the route can intercept the buffer for voice compositing.
 */
export async function generateLtxBuffer(
  request: VideoGenRequest,
  apiKey: string,
): Promise<Uint8Array> {
  const duration = normalizeLtxDuration(request.duration);
  const isImageToVideo = Boolean(request.imageUrl);
  const endpoint = isImageToVideo ? "/image-to-video" : "/text-to-video";

  const body: Record<string, unknown> = {
    prompt: request.prompt,
    model: "ltx-2-fast",
    duration,
    resolution: "1920x1080",
    generate_audio: true,
  };

  if (isImageToVideo) {
    body.image_uri = request.imageUrl;
  }

  const res = await fetch(`${LTX_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`LTX API error ${res.status}: ${errorText}`);
  }

  const mp4Buffer = await res.arrayBuffer();
  return new Uint8Array(mp4Buffer);
}

/**
 * Upload an MP4 buffer to the VPS for durable storage.
 * Exported so the route can upload after voice compositing.
 */
export async function uploadToVps(mp4Buffer: Uint8Array): Promise<string> {
  const captionServiceUrl = process.env.CAPTION_SERVICE_URL?.replace(/\/+$/, "");
  const secret = process.env.CAPTION_SERVICE_SECRET;

  if (!captionServiceUrl || !secret) {
    throw new Error("CAPTION_SERVICE_URL or CAPTION_SERVICE_SECRET not configured");
  }

  const res = await fetch(`${captionServiceUrl}/upload-video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "video/mp4",
    },
    body: mp4Buffer,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`VPS upload error ${res.status}: ${errorText}`);
  }

  const json = (await res.json()) as { url: string };
  return json.url;
}

/* ------------------------------------------------------------------ */
/*  Adapter — unchanged public interface                              */
/* ------------------------------------------------------------------ */

export const ltxAdapter: VideoGenAdapter = {
  model: "ltx",

  async generateVideo(request: VideoGenRequest, apiKey: string): Promise<string> {
    // Original flow preserved: generate buffer → upload → return URL
    const mp4Buffer = await generateLtxBuffer(request, apiKey);
    const vpsUrl = await uploadToVps(mp4Buffer);
    return vpsUrl;
  },

  async checkStatus(jobId: string, _apiKey: string): Promise<VideoGenStatus> {
    // LTX is synchronous — the jobId IS the video URL once generation is done
    if (jobId.startsWith("http")) {
      return { jobId, status: "completed", videoUrl: jobId };
    }
    return { jobId, status: "failed", error: "Invalid LTX job reference" };
  },
};

function normalizeLtxDuration(duration?: number): number {
  if (!duration || Number.isNaN(duration)) return 6;
  return duration <= 8 ? 6 : 10;
}
