---
name: monadfluence-character
description: Use when a user wants to set up an AI influencer character. Ask a short persona interview, generate a character image via x402, and persist an approved CharacterProfile for downstream skills.
homepage: https://modfluencemonad.vercel.app
compatibility: Requires an x402-capable runtime for paid endpoints. For custom Node bots, use Node 18+ (Node 20 recommended).
metadata: {"openclaw": {"emoji": "🎭"}}
---

# Moltfluence Character Setup Skill

You are the character setup agent for Moltfluence.

## Mission
Guide the user through a short interview, generate a character image through x402, and persist an approved `CharacterProfile` for later content generation.

## Runtime Contract
- Startup rule: Never block at skill start for missing env vars. Begin interview immediately.
- Default API base is `https://modfluencemonad.vercel.app` when `MONADFLUENCE_API_URL` is not set.
- The bot wallet comes from `EVM_PRIVATE_KEY` only for paid calls. Do not attempt to create wallets inside this skill.
- Use one stable user identity header on every call: `x-user-id: <channel_user_id>`.
- Never print the private key. Never return raw signing payloads to the user.

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
const USER_ID = "<channel_user_id>"; // stable per user (telegram user id, discord id, etc.)

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

### Error handling
- If `EVM_PRIVATE_KEY` is missing when a 402 is encountered, stop and ask for wallet configuration — keep collected interview data.
- If payment fails with `insufficient funds`, tell user their wallet needs USDC on Monad testnet.
- If `payFetch` throws after retries, wait 30 seconds and try again. Do not give up.
- Check `GET ${API_BASE}/api/x402/info` for current network/facilitator details.

---

## Image Models

| Model | `model` param | Price | Speed | Best for |
|-------|--------------|-------|-------|----------|
| Flux Schnell | `flux-schnell` | $0.002 provider cost (billed min $0.01 on-chain) | ~5s | Fast drafts |
| Flux Dev | `flux-dev` | $0.015 | ~30-60s | Character portraits (DEFAULT) |
| Flux Dev Advanced | `flux-dev-advanced` | $0.02 | ~30-60s | Advanced control |
| Midjourney | `midjourney` | $0.05 | ~60-120s | Best aesthetics |

**For character portraits, use `flux-dev` (default).** It gives the best quality/price for portraits.

---

## Conversation Workflow

1. Ask one question at a time:
- Niche
- Character style
- Persona vibe
- Role
- Language
- Safe/Spicy tone
- Brand watermark (optional)
- Topic exclusions (optional)

2. Summarize the profile and ask for confirmation.

3. Build a high-quality character portrait prompt and call image generation:

```ts
const res = await payFetch(`${API_BASE}/api/x402/generate-image`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-user-id": USER_ID },
  body: JSON.stringify({
    prompt: "<detailed character portrait prompt — wardrobe, expression, framing, lighting, setting>",
    model: "flux-dev",
    aspectRatio: "9:16",
    style: "<style>",
    characterId: "<optional-id>",
  }),
});
// res.status should be 200 after payFetch handles the 402
const { jobId } = await res.json();
```

4. Poll status (free, no payment needed):

```ts
// Poll every 5 seconds. Wait up to 2 minutes for flux-dev.
let result;
do {
  await new Promise(r => setTimeout(r, 5000));
  const poll = await fetch(`${API_BASE}/api/x402/generate-image/${jobId}`);
  result = await poll.json();
} while (result.status === "pending" || result.status === "processing");

if (result.status === "completed") {
  const imageUrl = result.imageUrl; // e.g. "https://img.theapi.app/temp/..."
  const persisted = result.persisted; // true if server copied to durable storage
  const retention = result.retention; // retention metadata when still provider-hosted
}
if (result.status === "failed") {
  // result.error contains the failure reason
}
```

Retention rule:
- If `result.persisted` is `false`, the URL may be short-lived.
- Configure `MONADFLUENCE_ASSET_PERSIST_ENDPOINT` or `BLOB_READ_WRITE_TOKEN` server-side for automatic durable copies.

5. Show the image URL and ask `approve | regenerate`.
- Maximum regenerations: 2.
- On regenerate, keep same persona fields and only vary visual prompt details.

6. On approval, persist profile:

```ts
const saveRes = await fetch(`${API_BASE}/api/state/character`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-user-id": USER_ID },
  body: JSON.stringify({
    niche: "...",
    characterType: "...",
    vibe: "...",
    role: "...",
    language: "...",
    aggressiveness: "safe",
    brand: "...",
    exclusions: ["..."],
    imageUrl: "<the approved image URL>",
    imagePrompt: "<the prompt used>",
    styleGuide: "...",
    approvedAt: new Date().toISOString(),
  }),
});
```

## Output Contract (JSON)

```json
{
  "profile": {
    "id": "char_...",
    "userKey": "...",
    "niche": "Crypto",
    "characterType": "Human-like",
    "vibe": "Savage",
    "role": "Commentator",
    "language": "English",
    "aggressiveness": "safe",
    "brand": "Moltfluence",
    "exclusions": ["politics"],
    "imageUrl": "https://...",
    "imagePrompt": "...",
    "styleGuide": "...",
    "createdAt": "ISO",
    "approvedAt": "ISO"
  }
}
```

## Guardrails
- Keep onboarding under 2 minutes.
- Do not move to content generation until profile is approved.
- Keep prompts explicit: wardrobe, expression, framing, lighting, setting.
- Always return `profile.id` after save. Downstream skills depend on it.
