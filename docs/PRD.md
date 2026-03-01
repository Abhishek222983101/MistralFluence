# Moltfluence — Moltiverse Hackathon PRD

**Tagline:** Your AI agent becomes an influencer — and monetizes itself on Monad.
**Track:** Agent Track ($60K) | **Bounty:** Open Innovation

## 1. Problem

Distribution is hard. AI can generate content but nobody has the full autonomous loop: research → script → render → post → monetize — coordinated by agents with crypto-native payments.

## 2. Vision

Autonomous AI influencer agent on Monad. User defines character in 60s, agent swarm does the rest. Every video generation triggers on-chain USDT payment on Monad.

## 3. Why Monad

- 10K TPS, sub-second finality, low fees
- EVM compatible — USDT, EIP-3009, standard tooling
- Micropayments ($0.05–$0.50) economically viable
- x402 facilitator supports EVM chains natively

## 4. User Flow

1. **Character Definition** (60s) — niche, vibe, role → AI generates image + name + style
2. **Agent Swarm** — trend harvest → script gen → prompt compile
3. **Model Selection** — Basic (3 free) / Pro (1 free) / Ultra (1 free), then x402 pay
4. **Render + QA** — video gen + automated validation
5. **Instagram Autopost** — OAuth → upload → publish

## 5. Payments (x402 on Monad)

- Asset: USDT on Monad (eip155:143 or eip155:10143)
- Protocol: x402 v2, EIP-3009 transferWithAuthorization
- Facilitator: facilitator.mcpay.tech

## 6. Already Built (from Solana version)

- Next.js app + UI ✅
- Video gen Hailuo/Kling ✅
- x402 payment flow ✅ (swap to Monad EVM)
- Instagram OAuth + autopost ✅
- Studio (VideoGenerator + ReelPublisher) ✅
- Video pricing ✅ (add free tier)

## 7. New Work

**P0:** Character creation UI, x402 rewrite for Monad EVM, agent swarm (trend + script + prompt compiler), free quota system, remove Solana deps + add viem.
**P1:** QA Agent, landing page, demo video.

## 8. Success Criteria

- Character created in <2 min
- Video rendered successfully
- x402 micropayment on Monad completes
- Instagram autopost works
- Free quota logic functional

## 9. Tech Stack

- **Frontend:** Next.js 14, Tailwind v4, React 18
- **Chain:** Monad (EVM, Chain ID 143/10143)
- **Payments:** x402 v2, USDT, EIP-3009
- **Video:** Hailuo v2.3, Kling v2.6
- **AI:** GPT-4o (character + scripts), trend APIs
- **Distribution:** Instagram Graph API
