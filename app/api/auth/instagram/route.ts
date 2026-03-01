import { NextResponse } from "next/server";

export async function GET() {
  const prebuilt = process.env.INSTAGRAM_OAUTH_URL?.trim();
  if (prebuilt) {
    return NextResponse.redirect(prebuilt);
  }

  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION?.trim() || "v21.0";
  const scope =
    process.env.INSTAGRAM_OAUTH_SCOPES?.trim() ||
    "instagram_business_basic,instagram_business_content_publish,pages_show_list,business_management";

  if (!appId || !redirectUri) {
    return NextResponse.json(
      {
        error: "Instagram OAuth is not configured.",
        hint: "Set FACEBOOK_APP_ID and INSTAGRAM_REDIRECT_URI (or provide INSTAGRAM_OAUTH_URL).",
      },
      { status: 501 },
    );
  }

  const state = crypto.randomUUID();
  const oauthUrl = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  oauthUrl.searchParams.set("client_id", appId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("scope", scope);

  const res = NextResponse.redirect(oauthUrl);
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
