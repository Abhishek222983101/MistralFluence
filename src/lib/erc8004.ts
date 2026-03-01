/**
 * ERC-8004 Agent Identity Registry Client
 * https://eips.ethereum.org/EIPS/eip-8004
 *
 * Registers monadfluence as an on-chain agent on the Monad Identity Registry.
 *
 * Registration flow (4 steps per spec):
 *   1. register()          → mint identity NFT, get agentId (no URI yet)
 *   2. Build agent card    → JSON following ERC-8004 schema with registrations[]
 *   3. Upload to Pinata    → get IPFS CID
 *   4. setAgentURI()       → point the on-chain NFT to ipfs://CID
 *
 * Contract addresses:
 *   Monad Testnet  (10143): 0x8004A818BFB912233c491871b3d84c89A494BD9e
 *   Monad Mainnet  (143):   0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseEventLogs,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ---------------------------------------------------------------------------
// Chain definitions
// ---------------------------------------------------------------------------

export const monadTestnet: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
    public: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
};

export const monadMainnet: Chain = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
    public: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://monadexplorer.com" },
  },
};

// ---------------------------------------------------------------------------
// Registry addresses
// ---------------------------------------------------------------------------

export const REGISTRY = {
  testnet: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const,
  mainnet: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const,
} as const;

// Correct ABI per the live ERC-8004 contract
const REGISTRY_ABI = parseAbi([
  "function register() external returns (uint256 agentId)",
  "function setAgentURI(uint256 agentId, string newURI) external",
  "function getAgentURI(uint256 agentId) external view returns (string)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
]);

// ---------------------------------------------------------------------------
// ERC-8004 Agent Card schema
// ---------------------------------------------------------------------------

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
}

export interface AgentRegistration {
  agentId: number;
  agentRegistry: string; // CAIP-10: eip155:{chainId}:{address}
}

/** Agent Card JSON — the canonical off-chain identity document */
export interface AgentCard {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
  name: string;
  description: string;
  image: string;
  services: AgentService[];
  registrations: AgentRegistration[];
  x402Support: boolean;
  active: boolean;
  supportedTrust: ("reputation" | "crypto-economic" | "tee-attestation")[];
}

// ---------------------------------------------------------------------------
// IPFS upload via Pinata
// ---------------------------------------------------------------------------

async function uploadToPinata(card: AgentCard, agentId: bigint): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.PINATA_GATEWAY;

  if (!jwt || !gateway) {
    throw new Error(
      "PINATA_JWT and PINATA_GATEWAY are required for production ERC-8004 registration. " +
        "Sign up at https://pinata.cloud and set these in your .env"
    );
  }

  const blob = new Blob([JSON.stringify(card, null, 2)], { type: "application/json" });
  const file = new File([blob], `monadfluence-agent-${agentId}.json`, {
    type: "application/json",
  });

  const form = new FormData();
  form.append("file", file);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: `monadfluence-agent-${agentId}` })
  );
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Pinata upload failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  const cid = data.IpfsHash;

  console.log(`[erc8004] Uploaded agent card to IPFS: ipfs://${cid}`);
  console.log(`[erc8004] Gateway URL: https://${gateway}/ipfs/${cid}`);

  return `ipfs://${cid}`;
}

// ---------------------------------------------------------------------------
// Build the canonical agent card
// ---------------------------------------------------------------------------

export function buildAgentCard(opts: {
  agentId: bigint;
  chain: Chain;
  registryAddress: `0x${string}`;
  apiBase: string;
}): AgentCard {
  const { agentId, chain, registryAddress, apiBase } = opts;

  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "monadfluence",
    description:
      "AI-powered autonomous influencer pipeline on Monad. " +
      "Research trending topics → generate scripts → create LTX-2 videos → publish to Instagram. " +
      "All actions are paid via x402 micropayments using USDC on Monad. " +
      "Capabilities: image-generation, video-generation, instagram-publishing, content-research.",
    // Default agent avatar — replace with your own IPFS image if desired
    image: "ipfs://bafkreiaims435hmzeg3l6ixlrlvnei7wept5kmfd6c2ncz3ucl466xhucu",
    services: [
      {
        name: "web",
        endpoint: apiBase,
      },
      {
        name: "x402",
        endpoint: `${apiBase}/api/x402/info`,
      },
      {
        name: "skills",
        endpoint: `${apiBase}/api/skills`,
      },
    ],
    registrations: [
      {
        agentId: Number(agentId),
        agentRegistry: `eip155:${chain.id}:${registryAddress}`,
      },
    ],
    x402Support: true,
    active: true,
    supportedTrust: ["reputation"],
  };
}

// ---------------------------------------------------------------------------
// Core registration function
// ---------------------------------------------------------------------------

export interface RegisterResult {
  agentId: bigint;
  ipfsUri: string;
  txHash: `0x${string}`;
  setUriTxHash: `0x${string}`;
  explorerUrl: string;
}

export async function registerAgentOnChain(opts?: {
  /** Override which chain to register on. Defaults to MONAD_NETWORK env or testnet. */
  network?: "testnet" | "mainnet";
  /** Override the agent API base URL. Defaults to NEXT_PUBLIC_URL env. */
  apiBase?: string;
}): Promise<RegisterResult> {
  const useMainnet =
    opts?.network === "mainnet" ||
    process.env.MONAD_NETWORK === "mainnet" ||
    process.env.X402_NETWORK === "eip155:143";

  const chain = useMainnet ? monadMainnet : monadTestnet;
  const registryAddress = useMainnet ? REGISTRY.mainnet : REGISTRY.testnet;
  const apiBase =
    opts?.apiBase ??
    process.env.NEXT_PUBLIC_URL?.trim() ??
    "https://monadfluencemonad.vercel.app";

  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey) throw new Error("AGENT_PRIVATE_KEY env var is required");

  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ account, chain, transport: http() });

  console.log(`[erc8004] Registering on ${chain.name} (${chain.id})`);
  console.log(`[erc8004] Registry: ${registryAddress}`);
  console.log(`[erc8004] Owner wallet: ${account.address}`);

  // ------------------------------------------------------------------
  // Step 1: register() — mint identity NFT, no URI yet
  // ------------------------------------------------------------------
  console.log("[erc8004] Step 1/4: Calling register() on-chain...");

  const registerHash = await walletClient.writeContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "register",
    args: [],
  });

  console.log(`[erc8004] register() tx: ${registerHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: registerHash,
    timeout: 60_000,
  });

  // Parse the Registered event to extract agentId
  const logs = parseEventLogs({
    abi: REGISTRY_ABI,
    logs: receipt.logs,
    eventName: "Registered",
  });

  if (logs.length === 0) {
    throw new Error(
      `No Registered event found in tx ${registerHash}. Check the registry address.`
    );
  }

  const agentId = logs[0].args.agentId;
  console.log(`[erc8004] Step 1/4 done. Agent ID: ${agentId}`);

  // ------------------------------------------------------------------
  // Step 2: Build agent card with registrations[] populated
  // ------------------------------------------------------------------
  console.log("[erc8004] Step 2/4: Building agent card...");

  const agentCard = buildAgentCard({ agentId, chain, registryAddress, apiBase });
  console.log("[erc8004] Step 2/4 done.");

  // ------------------------------------------------------------------
  // Step 3: Upload to Pinata IPFS
  // ------------------------------------------------------------------
  console.log("[erc8004] Step 3/4: Uploading agent card to IPFS via Pinata...");

  const ipfsUri = await uploadToPinata(agentCard, agentId);
  console.log(`[erc8004] Step 3/4 done. URI: ${ipfsUri}`);

  // ------------------------------------------------------------------
  // Step 4: setAgentURI() — link NFT to IPFS metadata
  // ------------------------------------------------------------------
  console.log("[erc8004] Step 4/4: Calling setAgentURI() on-chain...");

  const setUriHash = await walletClient.writeContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "setAgentURI",
    args: [agentId, ipfsUri],
  });

  await publicClient.waitForTransactionReceipt({
    hash: setUriHash,
    timeout: 60_000,
  });

  console.log(`[erc8004] Step 4/4 done. setAgentURI() tx: ${setUriHash}`);

  const explorerBase = chain.blockExplorers?.default.url ?? "";
  const explorerUrl = explorerBase ? `${explorerBase}/token/${registryAddress}/${agentId}` : "";

  console.log(`\n[erc8004] ✓ Registration complete!`);
  console.log(`  Agent ID  : ${agentId}`);
  console.log(`  IPFS URI  : ${ipfsUri}`);
  console.log(`  Explorer  : ${explorerUrl}`);
  console.log(
    `\n  Add to .env:\n  ERC8004_AGENT_ID=${agentId}\n  ERC8004_AGENT_URI=${ipfsUri}`
  );

  return {
    agentId,
    ipfsUri,
    txHash: registerHash,
    setUriTxHash: setUriHash,
    explorerUrl,
  };
}

// ---------------------------------------------------------------------------
// Read-only helpers
// ---------------------------------------------------------------------------

/** Fetch the current URI for any agent ID from the registry (no wallet needed). */
export async function getAgentURI(
  agentId: bigint,
  network: "testnet" | "mainnet" = "testnet"
): Promise<string> {
  const chain = network === "mainnet" ? monadMainnet : monadTestnet;
  const registryAddress = network === "mainnet" ? REGISTRY.mainnet : REGISTRY.testnet;

  const publicClient = createPublicClient({ chain, transport: http() });

  const uri = await publicClient.readContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getAgentURI",
    args: [agentId],
  });

  return uri as string;
}

/** Update the URI of an already-registered agent. */
export async function updateAgentURI(
  agentId: bigint,
  newUri: string,
  network: "testnet" | "mainnet" = "testnet"
): Promise<`0x${string}`> {
  const chain = network === "mainnet" ? monadMainnet : monadTestnet;
  const registryAddress = network === "mainnet" ? REGISTRY.mainnet : REGISTRY.testnet;

  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey) throw new Error("AGENT_PRIVATE_KEY env var is required");

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ account, chain, transport: http() });

  const hash = await walletClient.writeContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: "setAgentURI",
    args: [agentId, newUri],
  });

  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  console.log(`[erc8004] Updated agent ${agentId} URI to ${newUri} (tx: ${hash})`);

  return hash;
}
