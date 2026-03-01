import { NextResponse } from "next/server";
import { z } from "zod";
import { compilePrompt } from "@/lib/monadfluence/swarm";
import { VIDEO_MODELS } from "@/lib/monadfluence/types";

const profileSchema = z.object({
  id: z.string(),
  niche: z.string(),
  characterType: z.string(),
  vibe: z.string(),
  role: z.string(),
  language: z.string(),
  aggressiveness: z.enum(["safe", "spicy"]),
  brand: z.string().optional(),
  exclusions: z.array(z.string()).optional().default([]),
  imageUrl: z.string().url().optional(),
  imagePrompt: z.string().optional(),
  styleGuide: z.string().optional(),
});

const briefSchema = z.object({
  id: z.string(),
  userKey: z.string(),
  characterId: z.string().optional(),
  mode: z.enum(["auto-trends", "manual-topic"]),
  niche: z.string(),
  topic: z.string(),
  objective: z.string().optional(),
  createdAt: z.string(),
});

const scriptSchema = z.object({
  id: z.string(),
  title: z.string(),
  hook: z.string(),
  body: z.string(),
  cta: z.string(),
  durationTargetSec: z.number(),
});

const schema = z.object({
  profile: profileSchema,
  brief: briefSchema,
  script: scriptSchema,
  primaryModel: z.enum(VIDEO_MODELS).optional(),
});

export async function POST(req: Request) {
  try {
    const payload = schema.parse(await req.json());
    const promptPackage = compilePrompt({
      ...payload,
      profile: {
        ...payload.profile,
        userKey: payload.brief.userKey,
        createdAt: payload.brief.createdAt,
      },
    });

    return NextResponse.json({
      promptPackage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
