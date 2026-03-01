import { NextResponse } from "next/server";
import { runContentResearch } from "@/lib/research";
import { listAllCharacters } from "@/lib/monadfluence/state";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Auth: support both Bearer token and x-cron-secret header
    const authHeader = req.headers.get("authorization");
    const cronSecret = req.headers.get("x-cron-secret");
    const secret = process.env.CRON_SECRET;

    if (secret && secret.length > 0) {
      const authorized =
        authHeader === `Bearer ${secret}` ||
        cronSecret === secret;

      if (!authorized) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Get unique niches from all approved characters
    const characters = await listAllCharacters();
    const approvedChars = characters.filter((c) => c.approvedAt);
    const nicheSet = new Set(approvedChars.map((c) => c.niche.toLowerCase()));
    const niches = Array.from(nicheSet);

    // If no approved characters, still run for default niches
    if (niches.length === 0) {
      niches.push("crypto", "tech", "memes");
    }

    console.log(`[cron] Running research for ${niches.length} niches: ${niches.join(", ")}`);

    // Run research for each niche (sequentially to avoid rate limits)
    const results = [];
    for (const niche of niches) {
      try {
        const result = await runContentResearch(niche);
        results.push({
          niche,
          status: "success",
          topicsFound: result.cache.synthesizedTopics.length,
          rawItems: result.cache.rawItemCount,
          durationMs: result.durationMs,
          topics: result.cache.synthesizedTopics.map((t) => ({
            title: t.title,
            engagementScore: t.engagementScore,
            controversyScore: t.controversyScore,
          })),
        });
      } catch (err) {
        results.push({
          niche,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      nichesProcessed: niches.length,
      results,
    });
  } catch (error) {
    console.error("[cron] Research cron failed:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
