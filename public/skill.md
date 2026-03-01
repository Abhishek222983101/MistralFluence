---
name: monadfluence
version: 2.0.0
description: AI Influencer Pipeline on Monad. Autonomous research, identity synthesis, and LTX-2 video production with ERC-3009 gasless micropayments.
homepage: https://monadfluence.vercel.app
metadata: {"openclaw":{"emoji":"🎬","category":"creator-agent","api_base":"https://monadfluence.vercel.app"}}
---

# Monadfluence Skills Index

## Agent Identity (ERC-8004)

Standardized identity for AI agents on Monad.

- **Agent ID**: 1069
- **Identity Registry**: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- **Network**: `eip155:10143` (Monad Testnet)
- **Identity Card**: [ipfs://bafkreih4psknqpatw2hhutwz4lkc2i7cslss37o4qcwngz542mdfzabnqm](https://gateway.pinata.cloud/ipfs/bafkreih4psknqpatw2hhutwz4lkc2i7cslss37o4qcwngz542mdfzabnqm)

## Skill Endpoints

| Skill | URL | Purpose |
|------|-----|---------|
| `monadfluence-character` | `https://monadfluence.vercel.app/api/skills/monadfluence-character` | Persona interview, character image generation, approval loop |
| `monadfluence-content-research` | `https://monadfluence.vercel.app/api/skills/monadfluence-content-research` | Trending topic discovery from Reddit, HN, CoinGecko, Tavily |
| `monadfluence-script-writer` | `https://monadfluence.vercel.app/api/skills/monadfluence-script-writer` | Character-aware script generation (3 variants) |
| `monadfluence-prompt-compiler` | `https://monadfluence.vercel.app/api/skills/monadfluence-prompt-compiler` | LTX-2 optimized prompt compilation + linting |
| `monadfluence-content-publish` | `https://monadfluence.vercel.app/api/skills/monadfluence-content-publish` | Full pipeline: Research -> scripts -> generate video -> schedule |

## x402 Payment Contract (ERC-3009)

Every endpoint under `/api/x402/*` requires gasless payment in USDC on Monad testnet.

- **Network**: `eip155:10143` (Monad testnet)
- **USDC Address**: `0x534b2f3A21130d7a60830c2Df862319e593943A3`
- **Method**: `receiveWithAuthorization` (ERC-3009)

## API Surface

### Free Endpoints
- `GET /api/x402/info` - Get network & facilitator config
- `GET /api/state/character` - Load character profile
- `POST /api/swarm/trends` - Get trending topics
- `POST /api/swarm/scripts` - Generate scripts
- `POST /api/swarm/prompt-compile` - Compile LTX-2 prompt

### Paid Endpoints (Requires x402)
- `POST /api/x402/generate-image` - $0.015 - Generate persona portrait
- `POST /api/x402/generate-video` - $0.24 - Generate LTX-2 video (6s)
- `POST /api/x402/publish-reel` - $0.025 - Publish to Instagram

## Notes
- Video generation uses **LTX-2** as the primary model.
- Payments are processed through the **Molandak Facilitator**.
- The agent wallet is `0xcfe87024817D105AFbbC4D82237BfA45719DBD6c`.
