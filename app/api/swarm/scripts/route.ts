import { NextResponse } from "next/server";
import { z } from "zod";
import { generateScripts } from "@/lib/monadfluence/swarm";
import { saveContentBrief } from "@/lib/monadfluence/state";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";

const schema = z.object({
  characterProfile: z.object({
    id: z.string(),
    niche: z.string(),
    characterType: z.string(),
    vibe: z.string(),
    role: z.string(),
    language: z.string(),
    aggressiveness: z.enum(["safe", "spicy"]),
    brand: z.string().optional(),
    exclusions: z.array(z.string()).optional().default([]),
  }),
  mode: z.enum(["auto-trends", "manual-topic"]),
  topic: z.string().min(2).max(200),
  objective: z.string().max(200).optional(),
  nicheContext: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const payload = schema.parse(await req.json());
    const userKey = resolveUserKey(req, null);

    const brief = await saveContentBrief({
      userKey,
      characterId: payload.characterProfile.id,
      mode: payload.mode,
      niche: payload.characterProfile.niche,
      topic: payload.topic,
      objective: payload.objective,
    });

    const scripts = await generateScripts(
      {
        ...payload.characterProfile,
        userKey,
        createdAt: new Date().toISOString(),
      },
      brief,
      payload.nicheContext,
    );

    return NextResponse.json({
      brief,
      scripts,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
