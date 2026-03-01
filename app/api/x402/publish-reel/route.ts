/**
 * x402-compatible Instagram Reel publishing endpoint (Monad testnet).
 * Uses custom x402 v2 headers + facilitator verification.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCaption } from "@/lib/monadfluence/qa";
import { getTreasuryWallet } from "@/lib/video-pricing";
import { runLog } from "@/lib/monadfluence/run-log";
import { getInstagramConnection } from "@/lib/monadfluence/instagram-connection";
import {
  microUsdcToUsd,
  parsePaymentHeader,
  paymentAuditLog,
  verifyPaymentHeader,
  x402PaymentRequired,
} from "@/lib/x402";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";

const PUBLISH_COST_USDC_ATOMIC = 25_000; // $0.025 in 6-decimal USDC units

const publishSchema = z.object({
  videoUrl: z.string().url(),
  caption: z.string().max(2200).optional().default(""),
  hashtags: z.array(z.string()).optional().default([]),
  characterId: z.string().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const payload = publishSchema.parse(body);

    const captionCheck = validateCaption(payload.caption);
    if (!captionCheck.passed) {
      return NextResponse.json({ error: captionCheck.detail }, { status: 400 });
    }

    const treasury = getTreasuryWallet();
    if (!treasury) {
      return NextResponse.json({ error: "Treasury wallet not configured" }, { status: 500 });
    }

    const priceUsd = microUsdcToUsd(PUBLISH_COST_USDC_ATOMIC);
    const payment = parsePaymentHeader(req);
    const userKey = resolveUserKey(req, payment);
    const url = new URL(req.url);
    const resource = `${url.origin}${url.pathname}`;

    if (!payment) {
      return x402PaymentRequired({
        priceUsd,
        recipient: treasury,
        description: "Publish video as Instagram Reel",
        resourceUrl: resource,
      });
    }

    const verification = await verifyPaymentHeader({
      payment,
      expectedRecipient: treasury,
      resource,
      maxAmountRequired: String(PUBLISH_COST_USDC_ATOMIC),
      description: "Publish video as Instagram Reel",
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
      action: "publish-reel",
      payment,
      verification,
      userKey,
      resource,
    });

    const connectedInstagram = await getInstagramConnection();
    const igAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || connectedInstagram?.accessToken;
    const igUserId = process.env.INSTAGRAM_USER_ID?.trim() || connectedInstagram?.instagramUserId;

    if (!igAccessToken || !igUserId) {
      return NextResponse.json(
        { error: "Instagram credentials not configured. Connect Instagram first at /connect." },
        { status: 500 },
      );
    }

    const fullCaption = payload.hashtags.length
      ? `${payload.caption}\n\n${payload.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}`
      : payload.caption;

    const containerData = await retryJson(async () => {
      const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: payload.videoUrl,
          caption: fullCaption,
          media_type: "REELS",
          access_token: igAccessToken,
        }),
      });

      if (!containerRes.ok) {
        const err = await containerRes.json().catch(() => ({}));
        throw new Error(`Instagram container error: ${JSON.stringify(err)}`);
      }

      return containerRes.json();
    }, 3);

    const containerId = containerData?.id;
    if (!containerId) {
      throw new Error("Instagram did not return a container ID");
    }

    let ready = false;
    for (let i = 0; i < 30; i++) {
      await wait(5000);
      const statusRes = await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${igAccessToken}`,
      );
      const statusData: any = await statusRes.json().catch(() => ({}));

      if (statusData.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (statusData.status_code === "ERROR") {
        throw new Error("Instagram video processing failed");
      }
    }

    if (!ready) {
      throw new Error("Instagram video processing timed out");
    }

    const publishData = await retryJson(async () => {
      const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: igAccessToken,
        }),
      });

      if (!publishRes.ok) {
        const err = await publishRes.json().catch(() => ({}));
        throw new Error(`Instagram publish error: ${JSON.stringify(err)}`);
      }

      return publishRes.json();
    }, 3);

    const mediaId = publishData?.id;
    if (!mediaId) {
      throw new Error("Instagram publish did not return media id");
    }

    let canonicalUrl = `https://www.instagram.com/reel/${mediaId}/`;

    try {
      const permalinkRes = await fetch(
        `https://graph.facebook.com/v21.0/${mediaId}?fields=permalink&access_token=${igAccessToken}`,
      );
      const permalinkData: any = await permalinkRes.json().catch(() => ({}));
      if (typeof permalinkData?.permalink === "string" && permalinkData.permalink.length > 0) {
        canonicalUrl = permalinkData.permalink;
      }
    } catch {
      // Fallback URL already set.
    }

    runLog("publish.reel.completed", {
      mediaId,
      reelUrl: canonicalUrl,
      characterId: payload.characterId,
    });

    return NextResponse.json({
      success: true,
      mediaId,
      reelUrl: canonicalUrl,
      paid: true,
      characterId: payload.characterId,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

async function retryJson<T>(runner: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await runner();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await wait(500 * (i + 1));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Retry attempts exhausted");
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
