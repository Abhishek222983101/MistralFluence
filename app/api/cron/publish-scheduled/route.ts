import { NextResponse } from "next/server";
import { getDueScheduledPosts, updateScheduledPost } from "@/lib/monadfluence/state";
import { getInstagramConnection } from "@/lib/monadfluence/instagram-connection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const cronSecret = url.searchParams.get("secret");
    
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const duePosts = await getDueScheduledPosts();
    
    if (duePosts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No posts due",
        processed: 0 
      });
    }
    
    const results = [];
    
    for (const post of duePosts) {
      try {
        await updateScheduledPost(post.id, { status: "processing" });
        
        const dryRun = process.env.INSTAGRAM_DRY_RUN === "true";
        
        if (dryRun) {
          const fakeMediaId = `dry_run_${Date.now()}`;
          const fakeReelUrl = `https://www.instagram.com/reel/${fakeMediaId}/`;
          
          await updateScheduledPost(post.id, {
            status: "published",
            publishedAt: new Date().toISOString(),
            mediaId: fakeMediaId,
            reelUrl: fakeReelUrl,
          });
          
          results.push({
            id: post.id,
            success: true,
            dryRun: true,
            reelUrl: fakeReelUrl,
          });
          continue;
        }
        
        const connectedInstagram = await getInstagramConnection();
        const igAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || connectedInstagram?.accessToken;
        const igUserId = process.env.INSTAGRAM_USER_ID?.trim() || connectedInstagram?.instagramUserId;
        
        if (!igAccessToken || !igUserId) {
          throw new Error("Instagram credentials not configured");
        }
        
        const fullCaption = post.hashtags.length
          ? `${post.caption}\n\n${post.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}`
          : post.caption;
        
        const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_url: post.videoUrl,
            caption: fullCaption,
            media_type: "REELS",
            access_token: igAccessToken,
          }),
        });
        
        if (!containerRes.ok) {
          const err = await containerRes.json().catch(() => ({}));
          throw new Error(`Instagram container error: ${JSON.stringify(err)}`);
        }
        
        const containerData = await containerRes.json();
        const containerId = containerData?.id;
        
        if (!containerId) {
          throw new Error("Instagram did not return a container ID");
        }
        
        let ready = false;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          
          const statusRes = await fetch(
            `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${igAccessToken}`,
          );
          const statusData = await statusRes.json().catch(() => ({}));
          
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
        
        const publishData = await publishRes.json();
        const mediaId = publishData?.id;
        
        if (!mediaId) {
          throw new Error("Instagram publish did not return media id");
        }
        
        let reelUrl = `https://www.instagram.com/reel/${mediaId}/`;
        try {
          const permalinkRes = await fetch(
            `https://graph.facebook.com/v21.0/${mediaId}?fields=permalink&access_token=${igAccessToken}`,
          );
          const permalinkData = await permalinkRes.json().catch(() => ({}));
          if (permalinkData?.permalink) {
            reelUrl = permalinkData.permalink;
          }
        } catch {}
        
        await updateScheduledPost(post.id, {
          status: "published",
          publishedAt: new Date().toISOString(),
          mediaId,
          reelUrl,
        });
        
        results.push({
          id: post.id,
          success: true,
          reelUrl,
          mediaId,
        });
        
      } catch (err) {
        await updateScheduledPost(post.id, {
          status: "failed",
          error: (err as Error).message,
        });
        
        results.push({
          id: post.id,
          success: false,
          error: (err as Error).message,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
    
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
