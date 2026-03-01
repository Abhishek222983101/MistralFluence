/**
 * Image generation status polling endpoint.
 * Free to call — no payment needed for status checks.
 */

import { NextResponse } from "next/server";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";
import { getAssetRetentionPolicy, persistGeneratedAsset } from "@/lib/media-persistence";

const PIAPI_BASE = "https://api.piapi.ai/api/v1";

export async function GET(req: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const params = await context.params;
    const jobId = params.jobId;

    const apiKey = process.env.HAILUO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 },
      );
    }

    const res = await fetch(`${PIAPI_BASE}/task/${jobId}`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `PiAPI status error ${res.status}`, detail: body.slice(0, 500) },
        { status: 502 },
      );
    }

    const json: any = await res.json();
    const taskData = json.data ?? {};
    const status = (taskData.status ?? "pending").toLowerCase();

    if (status === "completed") {
      const sourceImageUrl =
        taskData.output?.image_url ??
        taskData.output?.image ??
        taskData.output?.images?.[0]?.url ??
        taskData.output?.images?.[0];
      const model = String(taskData.model ?? taskData.input?.model ?? "").toLowerCase() || undefined;

      if (!sourceImageUrl) {
        return NextResponse.json(
          { jobId, status: "failed", error: "Image generation completed but no image URL was returned" },
          { status: 502 },
        );
      }

      const userKey = resolveUserKey(req, null);
      const persisted = await persistGeneratedAsset({
        kind: "image",
        sourceUrl: sourceImageUrl,
        model,
        jobId,
        userKey,
      });
      const finalImageUrl = persisted?.url ?? sourceImageUrl;
      const retention = getAssetRetentionPolicy({
        kind: "image",
        model,
        persisted: Boolean(persisted),
        strategy: persisted?.strategy ?? "none",
      });

      return NextResponse.json({
        jobId,
        status: "completed",
        imageUrl: finalImageUrl,
        sourceImageUrl: persisted ? sourceImageUrl : undefined,
        model,
        persisted: Boolean(persisted),
        retention,
      });
    }

    if (status === "failed") {
      return NextResponse.json({
        jobId,
        status: "failed",
        error: taskData.error?.message ?? taskData.error?.raw_message ?? "Image generation failed",
      });
    }

    return NextResponse.json({
      jobId,
      status: status === "processing" ? "processing" : "pending",
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
