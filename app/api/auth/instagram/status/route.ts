import { NextResponse } from "next/server";
import { getInstagramConnection } from "@/lib/monadfluence/instagram-connection";

export async function GET() {
  const envConnected = Boolean(
    process.env.INSTAGRAM_ACCESS_TOKEN?.trim() && process.env.INSTAGRAM_USER_ID?.trim(),
  );

  if (envConnected) {
    return NextResponse.json({
      connected: true,
      source: "env",
      connection: {
        instagramUserId: process.env.INSTAGRAM_USER_ID?.trim(),
      },
    });
  }

  const saved = await getInstagramConnection();
  return NextResponse.json({
    connected: Boolean(saved?.accessToken && saved?.instagramUserId),
    source: saved ? "state" : "none",
    connection: saved
      ? {
          instagramUserId: saved.instagramUserId,
          pageId: saved.pageId,
          pageName: saved.pageName,
          username: saved.username,
          connectedAt: saved.connectedAt,
        }
      : null,
  });
}

