import { NextResponse } from "next/server";
import { getX402Config } from "@/lib/monadfluence/x402-config";
import { getTreasuryWallet } from "@/lib/video-pricing";

/**
 * Agent-friendly endpoint to introspect current x402 configuration.
 * This helps bot runtimes debug 402 challenges (network/asset/facilitator/payTo).
 */
export async function GET(req: Request) {
  const x402 = getX402Config();
  const treasury = getTreasuryWallet();

  const supportedUrl = (() => {
    try {
      return x402.facilitatorUrl ? new URL("/supported", x402.facilitatorUrl).toString() : null;
    } catch {
      return null;
    }
  })();

  const url = new URL(req.url);
  return NextResponse.json({
    treasuryWallet: treasury || null,
    facilitatorUrl: x402.facilitatorUrl ?? null,
    supportedUrl,
    assetPersistence: {
      externalEndpointConfigured: Boolean(
        process.env.MONADFLUENCE_ASSET_PERSIST_ENDPOINT?.trim() ||
          process.env.MOLTFLUENCE_ASSET_PERSIST_ENDPOINT?.trim(),
      ),
      vercelBlobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    },
    primary: x402.primary,
    // Useful for skills that need a stable default origin.
    requestOrigin: url.origin,
  });
}
