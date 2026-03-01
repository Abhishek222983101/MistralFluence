import { NextResponse } from "next/server";
import { getQuotaState, listQuota } from "@/lib/monadfluence/state";
import { resolveUserKey } from "@/lib/monadfluence/request-identity";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedUser = url.searchParams.get("userKey")?.trim();

    if (requestedUser) {
      const quota = await getQuotaState(requestedUser);
      return NextResponse.json({ userKey: requestedUser, quota });
    }

    const userKey = resolveUserKey(req, null);
    if (userKey !== "anonymous") {
      const quota = await getQuotaState(userKey);
      return NextResponse.json({ userKey, quota });
    }

    const all = await listQuota();
    return NextResponse.json({ users: all });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
