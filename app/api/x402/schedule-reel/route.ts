import { NextResponse } from "next/server";
import { z } from "zod";
import { schedulePost, getScheduledPosts, deleteScheduledPost, getScheduledPost } from "@/lib/monadfluence/state";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";

const scheduleSchema = z.object({
  videoUrl: z.string().url(),
  caption: z.string().max(2200).optional().default(""),
  hashtags: z.array(z.string()).optional().default([]),
  scheduledFor: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid ISO date string",
  }),
  characterId: z.string().optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const payload = scheduleSchema.parse(body);
    
    const scheduledTime = new Date(payload.scheduledFor);
    const now = new Date();
    
    if (scheduledTime <= now) {
      return NextResponse.json(
        { error: "scheduledFor must be in the future" },
        { status: 400 }
      );
    }
    
    const userKey = resolveUserKey(req, null);
    
    const post = await schedulePost({
      userKey,
      videoUrl: payload.videoUrl,
      caption: payload.caption,
      hashtags: payload.hashtags,
      scheduledFor: payload.scheduledFor,
      characterId: payload.characterId || "default",
    });
    
    return NextResponse.json({
      success: true,
      scheduledPost: post,
      message: `Post scheduled for ${scheduledTime.toISOString()}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const userKey = resolveUserKey(req, null);
    const posts = await getScheduledPosts(userKey);
    
    return NextResponse.json({
      posts,
      count: posts.length,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    
    const deleted = await deleteScheduledPost(id);
    
    if (!deleted) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: "Scheduled post deleted" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
