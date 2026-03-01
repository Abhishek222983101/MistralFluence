/**
 * x402-compatible image generation endpoint (Monad testnet).
 * Manual x402 header handling for per-model dynamic pricing.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getX402Config } from "@/lib/monadfluence/x402-config";
import { getTreasuryWallet } from "@/lib/video-pricing";
import { runLog } from "@/lib/monadfluence/run-log";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";
import { getImageAdapter, supportedImageModels } from "@/lib/imageGen";
import { IMAGE_PRICING, getImageCostNumeric, getImageProviderCostNumeric } from "@/lib/image-pricing";
import {
  parsePaymentHeader,
  paymentAuditLog,
  verifyPaymentHeader,
  x402PaymentRequired,
} from "@/lib/x402";

const IMAGE_MODELS = supportedImageModels() as [string, ...string[]];

const generateSchema = z.object({
  prompt: z.string().min(3).max(2000),
  model: z.enum(IMAGE_MODELS).optional().default("flux-dev"),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional().default("9:16"),
  style: z.string().optional(),
  characterId: z.string().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const payload = generateSchema.parse(body);

    const treasury = getTreasuryWallet();
    if (!treasury) {
      return NextResponse.json({ error: "Treasury wallet not configured" }, { status: 500 });
    }

    const apiKey = process.env.PIAPI_KEY || process.env.HAILUO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Image generation API key not configured" }, { status: 500 });
    }

    const costUsd = getImageCostNumeric(payload.model);
    const costMicroUsdc = Math.round(costUsd * 1_000_000);

    const payment = parsePaymentHeader(req);
    const userKey = resolveUserKey(req, payment);
    const url = new URL(req.url);
    const resource = `${url.origin}${url.pathname}`;

    if (!payment) {
      return x402PaymentRequired({
        priceUsd: costUsd,
        recipient: treasury,
        description: `AI image generation: ${payload.model}`,
        resourceUrl: resource,
      });
    }

    const verification = await verifyPaymentHeader({
      payment,
      expectedRecipient: treasury,
      resource,
      maxAmountRequired: String(costMicroUsdc),
      description: `AI image generation: ${payload.model}`,
    });

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: "Payment verification failed",
          detail: verification.reason ?? "unknown",
          requiredUsd: costUsd,
        },
        { status: 402 },
      );
    }

    paymentAuditLog({
      action: "generate-image",
      payment,
      verification,
      userKey,
      resource,
    });

    const adapter = getImageAdapter(payload.model);
    const jobId = await adapter.generateImage(
      {
        prompt: payload.prompt,
        aspectRatio: payload.aspectRatio,
        style: payload.style,
      },
      apiKey,
    );

    runLog("image.job.submitted", {
      jobId,
      model: payload.model,
      characterId: payload.characterId,
      userKey,
    });

    return NextResponse.json({
      jobId,
      model: payload.model,
      status: "pending",
      pollUrl: `/api/x402/generate-image/${jobId}`,
      paid: true,
      characterId: payload.characterId,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

/** GET — return pricing info and supported models */
export async function GET() {
  const x402Config = getX402Config();
  const treasury = getTreasuryWallet();

  const models: Record<string, { usd: number; description: string }> = {
    "flux-schnell": { usd: getImageCostNumeric("flux-schnell"), description: "Fast iteration, drafts" },
    "flux-dev": { usd: getImageCostNumeric("flux-dev"), description: "Character portraits (default)" },
    "flux-dev-advanced": { usd: getImageCostNumeric("flux-dev-advanced"), description: "Advanced control" },
    "midjourney": { usd: getImageCostNumeric("midjourney"), description: "Best aesthetics" },
  };
  const providerPricing: Record<string, { usd: number; piModel: string }> = {
    "flux-schnell": { usd: getImageProviderCostNumeric("flux-schnell"), piModel: IMAGE_PRICING["flux-schnell"].piModel },
    "flux-dev": { usd: getImageProviderCostNumeric("flux-dev"), piModel: IMAGE_PRICING["flux-dev"].piModel },
    "flux-dev-advanced": {
      usd: getImageProviderCostNumeric("flux-dev-advanced"),
      piModel: IMAGE_PRICING["flux-dev-advanced"].piModel,
    },
    "midjourney": { usd: getImageProviderCostNumeric("midjourney"), piModel: IMAGE_PRICING["midjourney"].piModel },
  };

  return NextResponse.json({
    x402: true,
    description: "AI image generation via x402 pay-per-call (Monad testnet).",
    models,
    providerPricing,
    pricingNotes: [
      "billed usd values include minimum transfer clamp ($0.01).",
      "providerPricing reflects PiAPI-side model costs before blockchain transfer minimum.",
    ],
    defaultModel: "flux-dev",
    treasury,
    networks: {
      primary: x402Config.primary,
      fallback: undefined,
    },
  });
}
