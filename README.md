# Moltfluence BNB

Autonomous AI influencer pipeline on BNB Chain. Agents create characters, generate videos, and publish to Instagram — paying per-use with USDT via x402 micropayments.

## How It Works

1. **Character setup** — 60-second interview creates an AI persona with generated portrait
2. **Agent swarm** — harvests trends, writes scripts, compiles model-ready prompts
3. **Video generation** — Hailuo, Kling, Hunyuan, SkyReels, Wan 2.6 (pay-per-call via x402)
4. **Instagram publish** — automated reel posting with character-matched captions

## Tech Stack

- **App:** Next.js 14, React 18, Tailwind v4
- **Chain:** BSC Mainnet (`eip155:56`)
- **Payments:** x402 v2, USDT via Permit2, self-hosted facilitator
- **Video/Image:** PiAPI (Hailuo v2.3, Kling v2.6, Flux, Midjourney)
- **Distribution:** Instagram Graph API v21.0

## Quick Start

```bash
npm install
cp .env.example .env   # fill in TREASURY_WALLET, FACILITATOR_PRIVATE_KEY, API keys
npm run dev
```

Verify: `curl http://localhost:3000/api/x402/info | jq .`

## Documentation

| Doc | What's in it |
|-----|-------------|
| [docs/PROJECT.md](docs/PROJECT.md) | Problem, solution, ecosystem impact, roadmap |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Architecture, setup, demo guide |
| [docs/EXTRAS.md](docs/EXTRAS.md) | Demo video and presentation links |
| [bsc.address](bsc.address) | Contract addresses and explorer links |

## On-chain

- **USDT:** [`0x55d398326f99059fF775485246999027B3197955`](https://bscscan.com/address/0x55d398326f99059fF775485246999027B3197955) (BSC, 18 decimals)
- **Permit2:** [`0x000000000022D473030F116dDEE9F6B43aC78BA3`](https://bscscan.com/address/0x000000000022D473030F116dDEE9F6B43aC78BA3) (canonical)
- **Transfer method:** Permit2 (`permitWitnessTransferFrom`)
- **No custom contracts** — uses native BSC USDT directly

## Agent Integration

Agents discover the API via [`/skill.md`](https://monadfluence-bnb.vercel.app/skill.md). All paid endpoints follow the x402 protocol — call without payment, get 402 challenge, sign, retry with payment header.

## Live

https://monadfluence-bnb.vercel.app
