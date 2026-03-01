/**
 * Client for the VPS caption service.
 * Calls the standalone caption-burning service with shared secret auth.
 */

export interface CaptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface CaptionResult {
  captionedVideoUrl: string;
  transcript: CaptionSegment[];
  durationSec: number;
}

export async function requestCaptions(opts: {
  videoUrl: string;
  style?: string;
}): Promise<CaptionResult> {
  const baseUrl = process.env.CAPTION_SERVICE_URL?.trim();
  if (!baseUrl) {
    throw new Error("CAPTION_SERVICE_URL not configured");
  }

  const secret = process.env.CAPTION_SERVICE_SECRET?.trim();
  if (!secret) {
    throw new Error("CAPTION_SERVICE_SECRET not configured");
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/caption`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        videoUrl: opts.videoUrl,
        style: opts.style ?? "tiktok-highlight",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Caption service error (${res.status}): ${body}`);
    }

    return (await res.json()) as CaptionResult;
  } finally {
    clearTimeout(timeout);
  }
}
