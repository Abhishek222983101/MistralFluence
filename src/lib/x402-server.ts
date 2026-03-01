/**
 * Shared x402 resource server instance for all withX402() routes.
 * Monad testnet x402 via hosted facilitator with USDC (6 decimals).
 */
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { RouteConfig } from "@x402/next";
import type { Network } from "@x402/core/types";

const NETWORK = process.env.X402_CAIP2?.trim() || process.env.X402_NETWORK?.trim() || "eip155:10143";
export const MONAD_NETWORK: Network = NETWORK as Network;

const MONAD_USDC = process.env.X402_ASSET?.trim() || "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const ASSET_NAME = process.env.X402_ASSET_NAME?.trim() || "USDC";
const ASSET_VERSION = process.env.X402_ASSET_VERSION?.trim() || "2";

const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL?.trim() || "https://x402-facilitator.molandak.org";

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
export const server = new x402ResourceServer(facilitatorClient);

const monadScheme = new ExactEvmScheme();
monadScheme.registerMoneyParser(async (amount: number, network: string) => {
  if (network === (MONAD_NETWORK as string)) {
    // Monad USDC has 6 decimals
    const wei = BigInt(Math.floor(amount * 1e6)).toString();
    return {
      amount: wei,
      asset: MONAD_USDC,
      extra: { name: ASSET_NAME, version: ASSET_VERSION },
    };
  }
  return null;
});

server.register(MONAD_NETWORK, monadScheme);

// Eagerly initialize (silently fails during build, succeeds at runtime)
server.initialize().catch(() => {});

export function routeConfig(
  price: string,
  description: string,
  payTo: string,
): RouteConfig {
  return {
    accepts: {
      scheme: "exact",
      network: MONAD_NETWORK,
      payTo,
      price,
    },
    description,
  };
}
