import { NextResponse } from "next/server";

/**
 * ERC-8004 endpoint verification file.
 * https://docs.pinata.cloud/tools/erc-8004/quickstart#endpoint-verification
 *
 * Verifiers fetch this to prove monadfluence controls this domain.
 * The registrations[] entry must match what's on-chain in the agent card.
 *
 * Set ERC8004_AGENT_ID and ERC8004_REGISTRY in .env after running:
 *   node scripts/register-agent.mjs
 */
export async function GET() {
  const agentId = process.env.ERC8004_AGENT_ID;
  const registry =
    process.env.ERC8004_REGISTRY ?? "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const network = process.env.ERC8004_NETWORK ?? "eip155:10143";

  // agentRegistry is the CAIP-10 format: eip155:{chainId}:{contractAddress}
  const agentRegistry = `${network}:${registry}`;

  const payload = {
    registrations: agentId
      ? [{ agentId: Number(agentId), agentRegistry }]
      : [],
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
