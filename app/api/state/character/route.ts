import { NextResponse } from "next/server";
import { z } from "zod";
import { getCharacterProfile, saveCharacterProfile } from "@/lib/monadfluence/state";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";

const schema = z.object({
  id: z.string().optional(),
  niche: z.string().min(2).max(80),
  characterType: z.string().min(2).max(80),
  vibe: z.string().min(2).max(80),
  role: z.string().min(2).max(80),
  language: z.string().min(2).max(80),
  aggressiveness: z.enum(["safe", "spicy"]),
  brand: z.string().max(80).optional(),
  exclusions: z.array(z.string()).optional().default([]),
  imageUrl: z.string().url().optional(),
  imagePrompt: z.string().max(4000).optional(),
  styleGuide: z.string().max(2000).optional(),
  approvedAt: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userKey = url.searchParams.get("userKey")?.trim() || resolveUserKey(req, null);
    const characterId = url.searchParams.get("characterId")?.trim() || undefined;

    const profile = await getCharacterProfile(userKey, characterId);
    if (!profile) {
      return NextResponse.json({ error: "Character profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = schema.parse(await req.json());
    const userKey = resolveUserKey(req, null);

    const profile = await saveCharacterProfile({
      ...payload,
      userKey,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
