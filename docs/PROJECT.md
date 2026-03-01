# Moltfluence BNB — Problem, Solution & Impact

## 1. Problem

AI can generate content, but nobody has the full autonomous loop: **research trending topics, write scripts, render video, publish to Instagram, and handle payments** — all coordinated by AI agents with crypto-native micropayments.

Today's creator tools are:
- **Fragmented** — separate tools for trends, scripting, rendering, publishing
- **Subscription-gated** — monthly fees regardless of usage
- **Not agent-friendly** — no programmatic API, no machine-to-machine payment flow

AI agents need to pay for compute (video generation costs $0.15–$2.40 per clip), but traditional payment rails don't work for autonomous software making hundreds of micro-transactions.

## 2. Solution

Moltfluence is an **autonomous AI influencer pipeline** where agents create, generate, and publish short-form video content — paying per-use with USDT on BSC via the x402 protocol.

**Key features:**
- **60-second character setup** — interview-style onboarding creates a persistent AI persona (niche, vibe, role, visual identity)
- **Agent swarm pipeline** — trend harvesting → script generation → prompt compilation → video rendering → Instagram publishing
- **x402 micropayments on BSC** — every generation is a pay-per-call API using USDT via Permit2, no subscriptions, no API keys
- **Self-hosted x402 facilitator** — verifies and settles payment signatures on-chain, no third-party dependency
- **Multi-model video generation** — Hailuo, Kling, Hunyuan Fast, SkyReels, Wan 2.6 with automatic fallback
- **Free tier** — 3 basic + 1 pro + 1 ultra free videos before x402 kicks in
- **Skills-based agent discovery** — `/skill.md` and `/skill.json` endpoints for agent platforms to discover and use the API

```mermaid
flowchart LR
    A[Agent] -->|1. Interview| B[Character Setup]
    B -->|2. Trends| C[Swarm Pipeline]
    C -->|3. x402 Pay| D[Video Generation]
    D -->|4. QA| E[Instagram Publish]
    E -->|5. x402 Pay| F[Live Reel]
```

**Why BSC:**
- Low gas fees make micropayments ($0.01–$2.40) economically viable
- BSC USDT is widely held — no wrapper tokens, no friction
- Permit2 deployed on BSC — gasless payment signatures for agents
- BNB Chain's agent ecosystem (BAP-578, ERC-8004, BAP.Market) aligns with x402

## 3. Business & Ecosystem Impact

**Target users:**
- AI agent developers building autonomous content creators
- Bot platforms (Telegram, Discord) that want monetized content skills
- Indie creators who want pay-per-use AI video without subscriptions

**Value to BNB ecosystem:**
- Demonstrates x402 + Permit2 working on BSC mainnet with native USDT
- Self-hosted facilitator pattern — reusable by any BSC project wanting x402
- Agent-first API design with skill discovery — compatible with BAP.Market, Eliza, MCP

**Monetization:**
- Treasury receives USDT per generation (margin over provider cost)
- Zero platform fees on the payment layer (self-hosted facilitator)

## 4. Limitations & Future Work

**Current limitations:**
- Instagram publishing requires manual OAuth setup
- Single-chain (BSC only, no cross-chain)
- Video generation depends on PiAPI availability
- Free tier state is file-based (not durable on serverless without external storage)

**Roadmap:**
- Register as BAP-578 Non-Fungible Agent on BAP.Market
- ERC-8004 agent identity for verifiable reputation
- Multi-platform publishing (TikTok, YouTube Shorts)
- On-chain generation receipts for transparent agent spend tracking
- Cross-chain x402 support (Base, Arbitrum)
