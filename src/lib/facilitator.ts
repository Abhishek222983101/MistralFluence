/**
 * Self-hosted x402 facilitator using @x402/core + @x402/evm.
 * Verifies and settles Permit2 payments
 * for USDC on Monad.
 */
import { x402Facilitator } from "@x402/core/facilitator";
import { registerExactEvmScheme } from "@x402/evm/exact/facilitator";
import { toFacilitatorEvmSigner } from "@x402/evm";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Network } from "@x402/core/types";

const X402_NETWORK = process.env.X402_NETWORK?.trim() || "eip155:10143";
const CHAIN_ID = Number(X402_NETWORK.split(":").pop() || "10143");
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const FACILITATOR_KEY = process.env.FACILITATOR_PRIVATE_KEY;
const MONAD_CHAIN = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 143 ? "Monad" : "Monad Testnet",
  network: CHAIN_ID === 143 ? "monad" : "monad-testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [MONAD_RPC_URL] },
    public: { http: [MONAD_RPC_URL] },
  },
});

function createFacilitator(): x402Facilitator {
  if (!FACILITATOR_KEY) {
    throw new Error("FACILITATOR_PRIVATE_KEY is required for self-hosted facilitator");
  }

  const account = privateKeyToAccount(FACILITATOR_KEY as `0x${string}`);
  const transport = http(MONAD_RPC_URL);

  const publicClient = createPublicClient({
    chain: MONAD_CHAIN,
    transport,
  });

  const walletClient = createWalletClient({
    account,
    chain: MONAD_CHAIN,
    transport,
  });

  // Combine public + wallet clients into a FacilitatorEvmSigner
  const signer = toFacilitatorEvmSigner({
    address: account.address,
    readContract: (args) => publicClient.readContract(args as any),
    verifyTypedData: (args) => publicClient.verifyTypedData(args as any),
    writeContract: (args) => walletClient.writeContract(args as any),
    sendTransaction: (args) => walletClient.sendTransaction(args as any),
    waitForTransactionReceipt: (args) =>
      publicClient.waitForTransactionReceipt(args as any).then((r) => ({
        status: r.status,
      })),
    getCode: (args) => publicClient.getCode(args as any),
  });

  const facilitator = new x402Facilitator();
  registerExactEvmScheme(facilitator, {
    signer,
    networks: X402_NETWORK as Network,
  });

  return facilitator;
}

let _instance: x402Facilitator | null = null;

export function getFacilitator(): x402Facilitator {
  if (!_instance) {
    _instance = createFacilitator();
  }
  return _instance;
}
