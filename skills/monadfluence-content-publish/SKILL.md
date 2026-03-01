---
name: monadfluence-content-publish
description: Use when a user wants to generate and publish content. Run trends to scripts to prompts to video generation to QA to Instagram publishing using x402 paid endpoints.
homepage: https://modfluencemonad.vercel.app
compatibility: Requires an x402-capable runtime for paid endpoints. For custom Node bots, use Node 18+ (Node 20 recommended).
metadata: {"openclaw": {"emoji": "🎬"}}
---

# Moltfluence Content + Publish Skill

You are the execution agent for content production and distribution.

## Mission
Run the full bot flow from topic selection to published reel URL.

## Runtime Contract
- Startup rule: Never block at skill start for missing env vars. Start workflow and only request keys at a payment step.
- Default API base is `https://modfluencemonad.vercel.app` when `MONADFLUENCE_API_URL` is not set.
- `EVM_PRIVATE_KEY` is required only when a call returns `402` and payment is needed.
- Bot wallet is externally provisioned and funded. Do not create wallets in this skill.
- Use one stable identity header for all calls: `x-user-id: <channel_user_id>`.
- Keep all intermediate IDs: `characterId`, `brief.id`, `script.id`, `jobId`, `mediaId`.

Use:

```bash
API_BASE="${MONADFLUENCE_API_URL:-https://modfluencemonad.vercel.app}"
```

---

## Payment — x402 on Monad Testnet (IMPORTANT)

All paid endpoints (`/api/x402/*`) use x402 micropayments with USDC on Monad testnet (`eip155:10143`).

### How it works (step by step)

1. You call the paid endpoint **without** a payment header.
2. You get back HTTP **402** with a `Payment-Required` response header (base64-encoded JSON).
3. You decode that header, sign a payment using the x402 SDK, and base64-encode the result.
4. You retry the **same request** with the header `PAYMENT-SIGNATURE: <base64-encoded-payload>`.
5. Now you get HTTP **200** with the actual response.

### Critical rules — read carefully

- `PAYMENT-SIGNATURE` is **NOT** a raw `0x...` hex string. It is a **base64-encoded JSON envelope** containing an EIP-3009 authorization + signature.
- Always use `undici` fetch. The built-in Node `fetch` can break with x402 headers.
- Always pass URLs as **strings** to fetch, never as `Request` objects.
- Do **NOT** use `wrapFetchWithPayment()` — it is unreliable in many runtimes.

### Setup (Node.js)

Install once:
```bash
npm install @x402/core @x402/evm viem undici
```

### Complete payment helper — copy this EXACTLY, do not modify it

```ts
import { x402Client } from "@x402/core/client";
import { decodePaymentRequiredHeader, encodePaymentSignatureHeader } from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { fetch as undiciFetch } from "undici";

const API_BASE = process.env.MONADFLUENCE_API_URL || "https://modfluencemonad.vercel.app";
const USER_ID = "<channel_user_id>";

const payer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const scheme = new ExactEvmScheme(payer);
const client = x402Client.fromConfig({
  schemes: [{ network: "eip155:*", client: scheme }],
});

/**
 * payFetch — handles x402 payment automatically WITH RETRIES.
 * Use for ALL paid calls (/api/x402/*).
 * Retries 3 times on transient facilitator errors.
 */
async function payFetch(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const unpaid = await undiciFetch(url, init);
      if (unpaid.status !== 402) return unpaid;

      const challengeB64 =
        unpaid.headers.get("Payment-Required") ||
        unpaid.headers.get("payment-required") ||
        unpaid.headers.get("PAYMENT-REQUIRED");
      if (!challengeB64) throw new Error("Got 402 but no Payment-Required header");

      const paymentRequired = decodePaymentRequiredHeader(challengeB64);
      const paymentPayload = await client.createPaymentPayload(paymentRequired);
      const paymentSig = encodePaymentSignatureHeader(paymentPayload);

      const paid = await undiciFetch(url, {
        ...init,
        headers: { ...(init.headers ?? {}), "PAYMENT-SIGNATURE": paymentSig },
      });

      if (paid.ok) return paid;

      if (paid.status === 402) {
        const errorBody = await paid.text().catch(() => "");
        lastError = new Error(`Payment attempt ${attempt + 1} failed: ${errorBody}`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      return paid;
    } catch (err) {
      lastError = err as Error;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw lastError ?? new Error("payFetch failed after 3 attempts");
}
```

### If your agent platform already supports x402

Just use that platform's x402 payment tool to handle the 402 challenge. You don't need the code above.

### IMPORTANT RULES

1. **Use `undici` fetch** — `import { fetch as undiciFetch } from "undici"`. Do NOT use built-in Node fetch.
2. **Pass URLs as strings** — never pass a `Request` object.
3. **Do NOT use `wrapFetchWithPayment()`** — it is unreliable.
4. **NEVER conclude the facilitator is broken** — "Facilitator verify failed" is a transient error. The `payFetch` above retries automatically. If all 3 retries fail, wait 30 seconds and call `payFetch` again. Payment WILL work.
5. **NEVER tell the user "we are blocked"** — x402 payment is tested and working. Always retry.

---

## Pricing

### Paid endpoints
| Endpoint | Price | Notes |
|----------|-------|-------|
| `POST /api/x402/generate-image` | $0.01–$0.05 | Depends on image model (see below) |
| `POST /api/x402/generate-video` | $0.15–$2.40 | Depends on video model + duration/voice mode (see below) |
| `POST /api/x402/publish-reel` | $0.025 | Fixed price |

### Image models
| Model | `model` param | Price | Speed | Best for |
|-------|--------------|-------|-------|----------|
| Flux Schnell | `flux-schnell` | $0.002 provider cost (billed min $0.01 on-chain) | ~5s | Fast drafts |
| Flux Dev | `flux-dev` | $0.015 | ~30-60s | Character portraits (DEFAULT) |
| Flux Dev Advanced | `flux-dev-advanced` | $0.02 | ~30-60s | Advanced control |
| Midjourney | `midjourney` | $0.05 | ~60-120s | Best aesthetics |

### Video models
| Model | `model` param | Short duration price | Long duration price | Best for |
|-------|--------------|-----------|------------|----------|
| Hailuo (`v2.3`, 768p) | `hailuo` | $0.23 (6s) | $0.45 (10s) | **Recommended default** best value |
| Kling (`voice: false`) | `kling` | $0.20 (5s mode) | $0.40 | Premium visual quality |
| Kling (`voice: true`) | `kling` | $0.66 (5s mode) | $1.32 | Premium visual + native audio (`mode: "pro"`) |
| Hunyuan Fast | `hunyuan-fast` | $0.20 (5s) | $0.40 (10s) | Budget + fast iteration |
| SkyReels V2 | `skyreels-v2` | $0.15 | $0.15 | Cheapest rapid variants |
| Wan 2.6 | `wan-2.6` | $0.60 (5s) | $2.40 (20s) | Best quality up to 20s |

### Error handling
- If `EVM_PRIVATE_KEY` is missing when `402` occurs, ask for wallet configuration and stop at that step.
- If `insufficient funds`, tell user to fund wallet with USDC on Monad testnet.
- If `payFetch` throws after retries, wait 30 seconds and try again. Do not give up.
- Check `GET ${API_BASE}/api/x402/info` for current network and facilitator details.

---

## Workflow

### Step 1: Load character profile (free)

```ts
const charRes = await fetch(`${API_BASE}/api/state/character`, {
  headers: { "x-user-id": USER_ID },
});
const character = await charRes.json();
// character = { id: "char_...", niche: "Crypto", ... }
```

If no character exists, tell user to run `monadfluence-character` first.

### Step 2: Ask user
- `auto trends` OR `manual topic`

### Step 3: Get trends (free)

The trends endpoint now returns rich `SynthesizedTopic` objects from real-time research (Reddit, HackerNews, CoinGecko, Tavily), not just topic strings. Topics include engagement scores, controversy ratings, hooks, and visual concepts.

For detailed research behavior, see the `monadfluence-content-research` skill.

```ts
const trendsRes = await fetch(`${API_BASE}/api/swarm/trends`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
  body: JSON.stringify({ niche: character.niche, manualTopic: "<optional>" }),
});
const trends = await trendsRes.json();
// trends.mode = "cached" | "auto-trends" | "manual-topic"
// trends.topics = SynthesizedTopic[] with title, angle, whyNow, hookIdea, engagementScore, controversyScore
```

Present topics to the user and let them pick one. Use the topic's `title` + `angle` as the topic string for script generation.

### Step 4: Generate scripts (free)

```ts
const scriptsRes = await fetch(`${API_BASE}/api/swarm/scripts`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
  body: JSON.stringify({
    characterProfile: character,
    mode: "auto-trends",
    topic: "<selected-topic>",
    objective: "<optional>",
  }),
});
const scripts = await scriptsRes.json();
```

### Step 5: Let user pick one script

### Step 6: Compile prompts using `monadfluence-prompt-compiler` (free)

```ts
const compileRes = await fetch(`${API_BASE}/api/swarm/prompt-compile`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
  body: JSON.stringify({
    profile: character,
    brief: selectedBrief,
    script: selectedScript,
    primaryModel: "hailuo",
  }),
});
const { promptPackage } = await compileRes.json();
```

### Step 7: Generate video (PAID — uses payFetch)

```ts
const vidRes = await payFetch(`${API_BASE}/api/x402/generate-video`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-user-id": USER_ID },
  body: JSON.stringify({
    prompt: promptPackage.primaryPrompt,
    model: "hailuo",
    tier: "basic",
    duration: 10,
    aspectRatio: "9:16",
    voice: false,
    characterId: character.id,
  }),
});
const { jobId, model: usedModel } = await vidRes.json();
```

Character consistency:
- Always pass `characterId` with video generation.
- Backend auto-loads the approved character `imageUrl` and uses it as image-to-video reference when available.
- Only pass a direct `imageUrl` override if user explicitly wants a different actor.

**Important:** The prompt MUST pass lint checks. It needs:
- Minimum ~50 characters
- A hook instruction for the first 2 seconds
- An explicit CTA instruction
- Vertical framing mention (9:16)

If you get `"Prompt failed lint checks"`, fix the prompt and retry.

### Step 8: Poll video (free, include `?model=` query param)

```ts
let vidStatus;
do {
  await new Promise(r => setTimeout(r, 6000)); // poll every 6 seconds
  const poll = await fetch(`${API_BASE}/api/x402/generate-video/${jobId}?model=${usedModel}`);
  vidStatus = await poll.json();
} while (vidStatus.status === "pending" || vidStatus.status === "processing");

if (vidStatus.status === "completed") {
  const videoUrl = vidStatus.videoUrl;
}
if (vidStatus.status === "failed") {
  // vidStatus.error — offer to regenerate once
}
```

Video generation takes 1-3 minutes. Poll every 5-8 seconds.

Retention rule:
- Treat provider URLs as temporary.
- Check `vidStatus.persisted` and `vidStatus.retention`.
- Configure `MONADFLUENCE_ASSET_PERSIST_ENDPOINT` or `BLOB_READ_WRITE_TOKEN` on server so completed assets are copied to durable storage automatically.

### Step 9: Confirm publish with user

### Step 10: Publish reel (PAID — uses payFetch)

```ts
const pubRes = await payFetch(`${API_BASE}/api/x402/publish-reel`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-user-id": USER_ID },
  body: JSON.stringify({
    videoUrl: videoUrl,
    caption: "<caption matching character vibe>",
    hashtags: ["monadfluence", "aiugc"],
    characterId: character.id,
  }),
});
const { success, reelUrl } = await pubRes.json();
```

### Step 11: Return final reel URL and concise summary

---

## Output Contract (JSON)

```json
{
  "result": {
    "characterId": "char_...",
    "topic": "...",
    "scriptId": "script_1",
    "video": {
      "jobId": "...",
      "model": "hailuo",
      "videoUrl": "https://..."
    },
    "publish": {
      "success": true,
      "mediaId": "...",
      "reelUrl": "https://www.instagram.com/reel/..."
    }
  }
}
```

## Guardrails
- Respect user approval before publishing.
- Keep each generation deterministic and trackable (job IDs, model used).
- Fail clearly with next-step guidance when payment or upstream services fail.
- If user chooses manual topic, skip trend list and proceed directly to script generation.
