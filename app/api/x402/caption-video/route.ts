/**
 * x402-compatible caption-video endpoint (Monad testnet).
 * Burns word-by-word animated captions into a video via VPS caption service.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getTreasuryWallet } from "@/lib/video-pricing";
import { runLog } from "@/lib/monadfluence/run-log";
import { updateGeneration } from "@/lib/monadfluence/state";
import { requestCaptions } from "@/lib/caption-service";
import {
  microUsdcToUsd,
  parsePaymentHeader,
  paymentAuditLog,
  verifyPaymentHeader,
  x402PaymentRequired,
} from "@/lib/x402";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";

const CAPTION_COST_USDC_ATOMIC = 10_000; // $0.01 in 6-decimal USDC units

const captionSchema = z.object({
  videoUrl: z.string().url(),
  style: z.string().optional().default("tiktok-highlight"),
  jobId: z.string().optional(),
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "caption-video",
    method: "POST",
    priceUsd: "$0.01",
    description: "Burn word-by-word animated captions into a video (TikTok/Reels style)",
    params: {
      videoUrl: "URL of the video to caption (required)",
      style: "Caption style — currently 'tiktok-highlight' (optional, default: tiktok-highlight)",
      jobId: "If provided, updates the GenerationRecord with the captioned video URL (optional)",
    },
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const payload = captionSchema.parse(body);

    const treasury = getTreasuryWallet();
    if (!treasury) {
      return NextResponse.json({ error: "Treasury wallet not configured" }, { status: 500 });
    }

    const priceUsd = microUsdcToUsd(CAPTION_COST_USDC_ATOMIC);
    const payment = parsePaymentHeader(req);
    const userKey = resolveUserKey(req, payment);
    const url = new URL(req.url);
    const resource = `${url.origin}${url.pathname}`;

    if (!payment) {
      return x402PaymentRequired({
        priceUsd,
        recipient: treasury,
        description: "Burn animated captions into video",
        resourceUrl: resource,
      });
    }

    const verification = await verifyPaymentHeader({
      payment,
      expectedRecipient: treasury,
      resource,
      maxAmountRequired: String(CAPTION_COST_USDC_ATOMIC),
      description: "Burn animated captions into video",
    });

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: "Payment verification failed",
          detail: verification.reason ?? "unknown",
          requiredUsd: priceUsd,
        },
        { status: 402 },
      );
    }

    paymentAuditLog({
      action: "caption-video",
      payment,
      verification,
      userKey,
      resource,
    });

    const result = await requestCaptions({
      videoUrl: payload.videoUrl,
      style: payload.style,
    });

    if (payload.jobId) {
      await updateGeneration(payload.jobId, {
        captionedVideoUrl: result.captionedVideoUrl,
      });
    }

    runLog("caption.video.completed", {
      captionedVideoUrl: result.captionedVideoUrl,
      durationSec: result.durationSec,
      segmentCount: result.transcript.length,
      jobId: payload.jobId,
    });

    return NextResponse.json({
      captionedVideoUrl: result.captionedVideoUrl,
      transcript: result.transcript,
      durationSec: result.durationSec,
      paid: true,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
