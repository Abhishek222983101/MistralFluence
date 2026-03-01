import { NextResponse } from "next/server";
import { z } from "zod";
import { harvestTrends } from "@/lib/monadfluence/swarm";

const schema = z.object({
  niche: z.string().min(2).max(80),
  manualTopic: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const payload = schema.parse(await req.json());
    const result = await harvestTrends(payload.niche, payload.manualTopic);

    return NextResponse.json({
      ...result,
      niche: payload.niche,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
