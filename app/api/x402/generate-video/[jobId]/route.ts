/**
 * LTX-2 video generation status endpoint.
 * LTX is synchronous — by the time this is called the video is already done.
 * This endpoint just reads the stored GenerationRecord.
 */

import { NextResponse } from "next/server";
import { getGeneration } from "@/lib/monadfluence/state";

export async function GET(_req: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const params = await context.params;
    const jobId = params.jobId;

    const record = await getGeneration(jobId);

    if (!record) {
      // Backward compatibility for legacy records where jobId was the video URL.
      if (jobId.startsWith("http")) {
        return NextResponse.json({
          jobId,
          status: "completed",
          videoUrl: jobId,
        });
      }
      return NextResponse.json({ error: "Generation record not found" }, { status: 404 });
    }

    return NextResponse.json({
      jobId: record.jobId,
      status: record.status,
      videoUrl: record.videoUrl,
      captionedVideoUrl: record.captionedVideoUrl,
      model: record.modelUsed,
      durationSec: record.duration,
      paid: record.paid,
      qa: record.qa,
      error: record.error,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
