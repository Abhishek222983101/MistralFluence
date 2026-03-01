import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveInstagramConnection } from "@/lib/monadfluence/instagram-connection";

const DEFAULT_GRAPH_VERSION = "v21.0";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const requestedPageId = url.searchParams.get("page_id");

  if (error) {
    return NextResponse.json(
      {
        error: "Instagram OAuth was denied",
        detail: errorDescription || error,
      },
      { status: 400 },
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code in callback URL." }, { status: 400 });
  }

  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.json(
      {
        error: "Facebook OAuth credentials are not configured.",
        hint: "Set FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and INSTAGRAM_REDIRECT_URI.",
      },
      { status: 500 },
    );
  }

  const expectedState = cookies().get("ig_oauth_state")?.value;

  if (expectedState && state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const shortTokenRes = await fetch(`https://graph.facebook.com/${graphVersion}/oauth/access_token?${tokenParams.toString()}`);
  const shortTokenJson: any = await shortTokenRes.json().catch(() => ({}));
  if (!shortTokenRes.ok || !shortTokenJson?.access_token) {
    return NextResponse.json(
      {
        error: "Failed to exchange OAuth code for access token.",
        detail: shortTokenJson?.error ?? shortTokenJson,
      },
      { status: 400 },
    );
  }

  let accessToken = shortTokenJson.access_token as string;
  let tokenType = shortTokenJson.token_type as string | undefined;
  let expiresIn = shortTokenJson.expires_in as number | undefined;

  const longTokenParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: accessToken,
  });

  const longTokenRes = await fetch(`https://graph.facebook.com/${graphVersion}/oauth/access_token?${longTokenParams.toString()}`);
  if (longTokenRes.ok) {
    const longTokenJson: any = await longTokenRes.json().catch(() => ({}));
    if (typeof longTokenJson?.access_token === "string") {
      accessToken = longTokenJson.access_token;
      tokenType = longTokenJson.token_type ?? tokenType;
      expiresIn = longTokenJson.expires_in ?? expiresIn;
    }
  }

  const pagesUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
  pagesUrl.searchParams.set("fields", "id,name,instagram_business_account{id,username,name}");
  pagesUrl.searchParams.set("access_token", accessToken);

  const pagesRes = await fetch(pagesUrl);
  const pagesJson: any = await pagesRes.json().catch(() => ({}));
  if (!pagesRes.ok || !Array.isArray(pagesJson?.data)) {
    return NextResponse.json(
      {
        error: "Failed to fetch Facebook Pages for this account.",
        detail: pagesJson?.error ?? pagesJson,
      },
      { status: 400 },
    );
  }

  const candidatePages = pagesJson.data.filter((page: any) => Boolean(page?.instagram_business_account?.id));
  if (candidatePages.length === 0) {
    return NextResponse.json(
      {
        error: "No Instagram Business account found on your Facebook Pages.",
        hint: "Link your Instagram professional account to a Facebook Page first.",
      },
      { status: 400 },
    );
  }

  const selectedPage =
    candidatePages.find((page: any) => requestedPageId && page?.id === requestedPageId) ?? candidatePages[0];
  const igAccount = selectedPage.instagram_business_account;
  const instagramUserId = String(igAccount.id);

  await saveInstagramConnection({
    accessToken,
    instagramUserId,
    pageId: String(selectedPage.id),
    pageName: selectedPage.name,
    username: igAccount.username ?? igAccount.name,
    tokenType,
    expiresIn,
    connectedAt: new Date().toISOString(),
  });

  const mode = url.searchParams.get("mode");
  const payload = {
    success: true,
    message: "Instagram connected successfully.",
    instagramUserId,
    pageId: String(selectedPage.id),
    pageName: selectedPage.name,
    username: igAccount.username ?? igAccount.name,
    tokenType,
    expiresIn,
    next: "You can now call POST /api/x402/publish-reel without setting INSTAGRAM_ACCESS_TOKEN/INSTAGRAM_USER_ID env vars.",
  };

  const res =
    mode === "json"
      ? NextResponse.json(payload)
      : NextResponse.redirect(new URL("/connect?ig=connected", req.url));

  res.cookies.set("ig_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
