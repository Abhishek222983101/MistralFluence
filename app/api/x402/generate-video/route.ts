/**
 * x402-compatible video generation endpoint.
 * Uses LTX-2-fast (1920x1080, English audio included).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getVideoCostAtomic, getTreasuryWallet } from "@/lib/video-pricing";
import { lintVideoPrompt } from "@/lib/monadfluence/prompt-lint";
import { getX402Config } from "@/lib/monadfluence/x402-config";
import { runLog } from "@/lib/monadfluence/run-log";
import type { CharacterProfile, GenerationRecord } from "@/lib/monadfluence/types";
import { getVideoAdapter } from "@/lib/videoGen";
import {
  microUsdcToUsd,
  parsePaymentHeader,
  paymentAuditLog,
  verifyPaymentHeader,
  x402PaymentRequired,
} from "@/lib/x402";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";
import { consumeFreeQuota, getCharacterProfile, getQuotaState, recordGeneration } from "@/lib/monadfluence/state";

const DEFAULT_MODEL = "ltx" as const;
const DEFAULT_DURATION = 6;

const generateSchema = z.object({
  prompt: z.string().min(3).max(2000),
  duration: z.number().int().min(6).max(10).optional().default(DEFAULT_DURATION),
  imageUrl: z.string().url().optional(),
  characterId: z.string().optional(),
});

function normalizeDuration(duration: number): number {
  return duration <= 8 ? 6 : 10;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const payload = generateSchema.parse(body);
    const normalizedDuration = normalizeDuration(payload.duration);

    const treasury = getTreasuryWallet();
    if (!treasury) {
      return NextResponse.json({ error: "Treasury wallet not configured" }, { status: 500 });
    }

    const payment = parsePaymentHeader(req);
    const userKey = resolveUserKey(req, payment);
    const url = new URL(req.url);
    const resource = `${url.origin}${url.pathname}`;

    const characterProfile = payload.characterId ? await getCharacterProfile(userKey, payload.characterId) : null;
    if (payload.characterId && !characterProfile) {
      return NextResponse.json({ error: `Character profile not found: ${payload.characterId}` }, { status: 404 });
    }

    const referenceImageUrl = payload.imageUrl ?? characterProfile?.imageUrl;
    const promptForGeneration = buildCharacterLockedPrompt(payload.prompt, characterProfile, referenceImageUrl);

    const lint = lintVideoPrompt(promptForGeneration);
    if (!lint.passed) {
      return NextResponse.json({ error: "Prompt failed lint checks", lint }, { status: 400 });
    }

    const costAtomic = getVideoCostAtomic(DEFAULT_MODEL, normalizedDuration);
    const priceUsd = microUsdcToUsd(costAtomic);
    const description = `AI video generation: LTX-2-fast ${normalizedDuration}s with audio`;

    let paid = false;
    let quotaState = await getQuotaState(userKey);
    let quotaUsed = 0;
    let paymentMeta: GenerationRecord["payment"] | undefined;

    if (!payment) {
      const consumed = await consumeFreeQuota(userKey, "basic", DEFAULT_MODEL);
      quotaState = consumed.quota;

      if (!consumed.usedFree) {
        return x402PaymentRequired({
          priceUsd,
          recipient: treasury,
          description,
          resourceUrl: resource,
        });
      }

      quotaUsed = 1;
    } else {
      const verification = await verifyPaymentHeader({
        payment,
        expectedRecipient: treasury,
        resource,
        maxAmountRequired: String(costAtomic),
        description,
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

      paid = true;
      paymentMeta = {
        txSignature: payment.txSignature,
        payer: verification.payer ?? payment.payer,
        network: verification.network ?? payment.network,
        asset: verification.asset ?? payment.asset,
      };

      paymentAuditLog({
        action: "generate-video",
        payment,
        verification,
        userKey,
        resource,
      });
    }

    const apiKey = process.env.LTX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "LTX_API_KEY not configured" }, { status: 500 });
    }

    const adapter = getVideoAdapter(DEFAULT_MODEL);

    // LTX is synchronous — generateVideo() blocks until the video is ready
    // and uploads it to the VPS, returning the final video URL.
    const videoUrl = await adapter.generateVideo(
      {
        prompt: promptForGeneration,
        duration: normalizedDuration,
        aspectRatio: "9:16",
        imageUrl: referenceImageUrl,
      },
      apiKey,
    );
    const jobId = `ltx_${crypto.randomUUID()}`;

    const record: GenerationRecord = {
      jobId,
      userKey,
      characterId: payload.characterId,
      modelRequested: DEFAULT_MODEL,
      modelUsed: DEFAULT_MODEL,
      tier: "basic",
      prompt: promptForGeneration,
      duration: normalizedDuration,
      aspectRatio: "9:16",
      referenceImageUrl,
      status: "completed",
      retries: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      videoUrl,
      paid,
      payment: paymentMeta,
    };

    await recordGeneration(record);
    runLog("video.job.submitted", {
      jobId,
      model: DEFAULT_MODEL,
      duration: normalizedDuration,
      referenceImageUsed: Boolean(referenceImageUrl),
      paid,
      quotaUsed,
      quotaRemaining: quotaState.tiers["basic"].remaining,
    });

    return NextResponse.json({
      jobId,
      model: DEFAULT_MODEL,
      status: "completed",
      videoUrl,
      pollUrl: `/api/x402/generate-video/${jobId}`,
      durationSec: normalizedDuration,
      audioEnabled: true,
      referenceImageUsed: Boolean(referenceImageUrl),
      paid,
      quotaUsed,
      quotaRemaining: quotaState.tiers["basic"].remaining,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

/** GET — return pricing and metadata */
export async function GET() {
  const x402Config = getX402Config();
  const treasury = getTreasuryWallet();

  return NextResponse.json({
    x402: true,
    description: "AI video generation — LTX-2-fast with English audio, via x402 pay-per-call (Monad testnet).",
    model: "ltx-2-fast",
    resolution: "1920x1080",
    audioEnabled: true,
    audioLanguage: "English",
    durations: [6, 10],
    pricing: {
      "6s": "$0.24",
      "10s": "$0.40",
    },
    params: {
      prompt: "required — video description",
      duration: "optional — 6 or 10 (default: 6)",
      characterId: "optional — locks actor identity via reference image",
      imageUrl: "optional — override reference image",
    },
    treasury,
    networks: {
      primary: x402Config.primary,
    },
  });
}

function buildCharacterLockedPrompt(
  prompt: string,
  character: CharacterProfile | null,
  referenceImageUrl?: string,
): string {
  const additions: string[] = [];

  if (referenceImageUrl) {
    additions.push(
      "Use the provided reference image to preserve the exact same actor identity (face geometry, skin tone, hair, and age) across the full clip.",
    );
  }
  if (character?.styleGuide) {
    additions.push(`Character style guide: ${character.styleGuide}`);
  }
  if (character?.role && character?.vibe) {
    additions.push(`Keep role and vibe consistent: ${character.role}, ${character.vibe}.`);
  }

  const merged = [prompt.trim(), ...additions].filter(Boolean).join(" ");
  return merged.length <= 1600 ? merged : `${merged.slice(0, 1597)}...`;
}
