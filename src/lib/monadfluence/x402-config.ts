export interface X402NetworkConfig {
  network: string;
  caip2: string;
  asset: string;
  assetName: string;
  assetVersion: string;
  assetTransferMethod: "eip3009" | "permit2";
}

export interface X402Config {
  primary: X402NetworkConfig;
  facilitatorUrl?: string;
}

const MONAD_CAIP2 = "eip155:10143";
const MONAD_USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const MONAD_ALIASES = new Set(["monad", "monad-testnet", "eip155:10143", "10143"]);

function normalizeMonadNetwork(input?: string): string {
  const value = input?.trim().toLowerCase();
  if (!value) return MONAD_CAIP2;
  if (MONAD_ALIASES.has(value)) return MONAD_CAIP2;
  return input!.trim();
}

function isHexAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeAsset(input: string, network: string): string {
  const value = input.trim();
  if (isHexAddress(value)) return value;
  if (network === MONAD_CAIP2 && value.toUpperCase() === "USDC") return MONAD_USDC;
  return value;
}

const networkValue = normalizeMonadNetwork(process.env.X402_NETWORK);
const caip2Value = normalizeMonadNetwork(process.env.X402_CAIP2 ?? networkValue);

const MONAD_DEFAULT: X402NetworkConfig = {
  network: networkValue,
  caip2: caip2Value,
  asset: normalizeAsset(process.env.X402_ASSET?.trim() || MONAD_USDC, caip2Value),
  assetName: process.env.X402_ASSET_NAME?.trim() || "USDC",
  assetVersion: process.env.X402_ASSET_VERSION?.trim() || "2",
  assetTransferMethod: (process.env.X402_ASSET_TRANSFER_METHOD?.trim() as "eip3009" | "permit2") || "eip3009",
};

export function getX402Config(): X402Config {
  return {
    primary: MONAD_DEFAULT,
    facilitatorUrl: process.env.X402_FACILITATOR_URL?.trim() || "https://x402-facilitator.molandak.org",
  };
}
