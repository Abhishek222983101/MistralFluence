# MonadInfluence - Detailed Implementation Plan

## Overview
Adapt the AI influencer pipeline from BSC to Monad testnet. The project has two main integration areas that can be worked on independently.

---

## Part A: x402 Payments (YOU)

### What needs to change

#### 1. Environment Variables (.env.example)
```
# Current (BSC)
BSC_RPC_URL=https://bsc-dataseed1.binance.org
X402_ASSET=0x55d398326f99059fF775485246999027B3197955  # USDT
X402_ASSET_TRANSFER_METHOD=permit2

# New (Monad Testnet)
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_USDC_ADDRESS=0x534b2f3A21130d7a60830c2Df862319e593943A3
X402_FACILITATOR_URL=https://x402-facilitator.molandak.org
```

#### 2. x402 Config File
**File:** `src/lib/monadfluence/x402-config.ts`

```typescript
// Current (BSC)
export const X402_CONFIG = {
  network: "eip155:56",
  asset: "0x55d398326f99059fF775485246999027B3197955", // USDT
  assetTransferMethod: "permit2" as const,
  facilitatorUrl: process.env.FACILITATOR_URL!,
};

// New (Monad)
export const X402_CONFIG = {
  network: "eip155:10143", // Monad testnet
  asset: "0x534b2f3A21130d7a60830c2Df862319e593943A3", // USDC
  assetTransferMethod: "permit2" as const, // or whatever Monad uses
  facilitatorUrl: "https://x402-facilitator.molandak.org",
};
```

#### 3. x402 Server Setup
**File:** `src/lib/x402-server.ts`

Update the network configuration to use Monad:
- Chain ID: `10143` (testnet), `143` (mainnet)
- USDC as payment token
- Use Monad's facilitator: `https://x402-facilitator.molandak.org`

#### 4. API Routes to Update
| File | Change |
|------|--------|
| `app/api/x402/info/route.ts` | Return Monad network info |
| `app/api/x402/generate-image/route.ts` | Use Monad USDC |
| `app/api/x402/generate-video/route.ts` | Use Monad USDC |
| `app/api/x402/caption-video/route.ts` | Use Monad USDC |
| `app/api/x402/publish-reel/route.ts` | Use Monad USDC |
| `app/api/facilitator/verify/route.ts` | Remove (use Monad facilitator) |
| `app/api/facilitator/settle/route.ts` | Remove (use Monad facilitator) |

#### 5. skill.md Update
**File:** `public/skill.md`

Update the payment section:
```
Network: eip155:10143 (Monad Testnet)
USDC Address: 0x534b2f3A21130d7a60830c2Df862319e593943A3
Facilitator: https://x402-facilitator.molandak.org
```

#### 6. Test Scripts
**Files:** `scripts/test-x402-payment.mjs`, `scripts/test-x402-image-payment.mjs`

Update to use:
- Monad RPC: `https://testnet-rpc.monad.xyz`
- USDC instead of USDT
- Agent wallet with Monad testnet USDC

### Getting Test Tokens
- **USDC:** Get from Circle faucet (faucet.circle.com)
- **MON (gas):** Get from Monad faucet (faucet.monad.xyz)

---

## Part B: ERC-8004 Agent Identity (FRIEND)

### What needs to change

#### 1. New File: ERC-8004 Client
**File:** `src/lib/erc8004.ts`

```typescript
// ERC-8004 Identity Registry on Monad Testnet
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

interface AgentRegistration {
  agentId: number;
  uri: string; // IPFS link to agent metadata
}

export async function registerAgent(
  name: string,
  description: string,
  endpoints: {
    mcp?: string;
    a2a?: string;
    x402?: string;
  }
): Promise<AgentRegistration> {
  // 1. Upload agent metadata to IPFS (via Pinata)
  // 2. Call Identity Registry contract to register
  // 3. Return agentId
}

export async function updateAgentUri(
  agentId: number,
  newUri: string
): Promise<void> {
  // Update the URI for existing agent
}
```

#### 2. skill.md Update
Add ERC-8004 agent metadata section:
```
## Agent Identity (ERC-8004)

Agent ID: [to be registered]
Identity Registry: 0x8004A818BFB912233c491871b3d84c89A494BD9e
Network: eip155:10143
```

#### 3. Agent Metadata Structure
```json
{
  "name": "monadfluence",
  "description": "AI influencer pipeline on Monad",
  "version": "1.0.0",
  "endpoints": {
    "x402": "https://monadfluence.vercel.app",
    "mcp": "https://monadfluence.vercel.app/api/mcp"
  },
  "capabilities": [
    "image-generation",
    "video-generation",
    "instagram-publishing"
  ],
  "payments": {
    "scheme": "exact",
    "network": "eip155:10143",
    "asset": "0x534b2f3A21130d7a60830c2Df862319e593943A3"
  }
}
```

### Contract Addresses (Monad)

| Network | Chain ID | Identity Registry |
|---------|----------|------------------|
| Monad Testnet | 10143 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Monad Mainnet | 143 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |

### Resources
- ERC-8004 Docs: https://docs.pinata.cloud/tools/erc-8004/quickstart
- Registry Contracts: https://github.com/erc-8004/erc-8004-contracts

---

## Files Summary

### You (x402)
- [ ] `.env.example` - Add Monad vars
- [ ] `src/lib/monadfluence/x402-config.ts` - Update network
- [ ] `src/lib/x402.ts` - Update chain config
- [ ] `src/lib/x402-server.ts` - Update facilitator
- [ ] `app/api/x402/info/route.ts` - Return Monad info
- [ ] `app/api/x402/*.route.ts` - Use USDC
- [ ] `app/api/facilitator/*` - Remove or update
- [ ] `public/skill.md` - Update payment instructions
- [ ] `scripts/*` - Update for Monad

### Friend (ERC-8004)
- [ ] `src/lib/erc8004.ts` - New file
- [ ] `public/skill.md` - Add agent metadata
- [ ] Register on Identity Registry

---

## Verification Steps

1. Run `npm run dev`
2. Visit `/api/x402/info` - should show Monad config
3. Get test USDC + MON from faucets
4. Test payment flow with script
5. Verify USDC transferred on Monad explorer
