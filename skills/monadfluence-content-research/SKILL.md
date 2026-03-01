---
skill: monadfluence-content-research
version: 1.0.0
consumer: openclaw-tg-bot
trigger: content-research-request
api_base: https://modfluencemonad.vercel.app
---

# Skill: Content Research Pipeline

## Scope Gate

Activate this skill ONLY when the user request matches one of:

- Asks for trending topics, viral topics, or "what's trending" in a niche
- Wants to know what to make content about
- Asks for content ideas, topic suggestions, or "what should I post about"
- Mentions trend research, topic discovery, or content research

Do NOT activate for: script writing (use `monadfluence-script-writer`), video generation, publishing, character creation, prompt compilation, or scheduling.

---

## Execution Steps

**CRITICAL: You must use the Moltfluence API. Do NOT search the web yourself. Do NOT use Brave, Google, or any search API. The research is done by the Moltfluence API, not by you.**

### Step 1 — Identify Niche

Determine the niche from context. Valid niches:

| Niche | Sources Used | What It Covers |
|-------|-------------|----------------|
| `crypto` | Reddit (r/cryptocurrency, r/bitcoin, r/ethereum, r/defi, r/CryptoMarkets), CoinGecko trending, Tavily | Crypto markets, DeFi, tokens, NFTs |
| `tech` | Reddit (r/technology, r/programming, r/artificial, r/MachineLearning, r/webdev), HackerNews, Tavily | Tech industry, AI/ML, programming, startups |
| `memes` | Reddit (r/memes, r/dankmemes, r/TikTokCringe, r/starterpacks), Tavily | Internet culture, viral content, memes |

If the user's niche doesn't match exactly, map it to the closest option:
- "bitcoin", "ethereum", "defi", "web3" → `crypto`
- "AI", "programming", "startups", "software" → `tech`
- "humor", "culture", "viral", "tiktok" → `memes`

If the user has a character profile loaded, use its `niche` field.

### Step 2 — Call the Moltfluence API (REQUIRED)

**You MUST make an HTTP POST request to the Moltfluence API. Do NOT try to search the web yourself.**

Make this exact HTTP request:

```
POST https://modfluencemonad.vercel.app/api/swarm/trends
Content-Type: application/json

{
  "niche": "crypto",
  "manualTopic": ""
}
```

- Use the `niche` identified in Step 1 (crypto, tech, or memes)
- Set `manualTopic` to empty string for auto-research
- Wait for the API response (8-15 seconds for fresh research, instant for cached)
- The API aggregates Reddit, CoinGecko, HackerNews, and Tavily data
- **Do NOT attempt to search or scrape anything yourself - use this API only**

The API will:
1. Check for a valid cache (< 2 hours old)
2. If cached, return immediately (mode: `"cached"`)
3. If no cache, run the full pipeline: Reddit + HN/CoinGecko + Tavily → dedup + score → Groq LLM synthesis
4. Cache the result (2-hour TTL)

**Latency**: Cached responses return instantly. Fresh research takes 8-15 seconds.

### Step 3 — Parse the Response

Expected `200 OK` response:

```json
{
  "mode": "cached",
  "topics": [
    {
      "id": "topic-1234567890-0",
      "title": "WLFI Surges 22.7%",
      "angle": "Why this small-cap coin is beating Bitcoin",
      "whyNow": "22.7% price surge in the last 24 hours",
      "hookIdea": "You won't believe which coin is outperforming Bitcoin right now",
      "controversyScore": 4,
      "engagementScore": 85,
      "visualConcept": "Split-screen comparison of WLFI and BTC price charts",
      "sources": ["coingecko-wlfi", "reddit-abc123"]
    }
  ],
  "niche": "crypto"
}
```

The `mode` field tells you where the data came from:
- `"cached"` — from a recent research cycle (< 2 hours old)
- `"auto-trends"` — freshly researched just now
- `"manual-topic"` — user provided a specific topic

### Step 4 — Present Topics to the User

Display all topics ranked by engagement score. Use this format:

> Trending Topics for **{niche}** ({mode})
>
> ---
>
> **1. {topics[0].title}** — Engagement: {engagementScore}/100 | Controversy: {controversyScore}/5
> Angle: {angle}
> Why now: {whyNow}
> Hook idea: "{hookIdea}"
>
> **2. {topics[1].title}** — Engagement: {engagementScore}/100 | Controversy: {controversyScore}/5
> ...
>
> ---
>
> Pick a topic to generate scripts, or ask me to research a different niche.

### Step 5 — Handle Follow-ups

After presenting topics:
- If user picks a topic → hand off to `monadfluence-script-writer` with the selected topic
- If user asks for a different niche → re-run Step 2 with the new niche
- If user provides a manual topic → re-run Step 2 with `manualTopic` set

---

## SynthesizedTopic Object Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique topic identifier |
| `title` | string | Max 10 words, punchy topic title |
| `angle` | string | The specific take that makes this a video |
| `whyNow` | string | What happened in the last 24h that makes this timely |
| `hookIdea` | string | Opening line for a 2-second scroll-stop hook |
| `controversyScore` | number | 1-5, how debate-worthy this take is |
| `engagementScore` | number | 1-100, predicted engagement (comments > likes > views) |
| `visualConcept` | string | What the viewer should SEE in the video |
| `sources` | string[] | Source IDs that contributed to this topic |

---

## Cron Behavior (Server-Side)

The research pipeline runs automatically via `GET /api/research/cron` every 2 hours:

1. Lists all approved characters from state
2. Extracts unique niches
3. Runs the full research pipeline for each niche
4. Caches results (2-hour TTL)

This means when a user asks for trends, there's usually a fresh cache available. The bot agent does NOT need to trigger the cron — it happens automatically on the server.

---

## Guardrails

1. **ALWAYS USE THE API** — You MUST call the Moltfluence API endpoint. Do NOT search the web, do NOT use Brave/Google/Bing APIs, do NOT try to find trends yourself. If the user asks for trends, you call `POST /api/swarm/trends` - no exceptions.
2. **Niche validation** — Only pass `crypto`, `tech`, or `memes` to the API. Map unknown niches to the closest match. Never pass arbitrary strings.
3. **No local research** — Do NOT search the web, scrape Reddit, or use other tools to find topics. Always use the Moltfluence API. The API aggregates from multiple sources with deduplication and LLM synthesis.
4. **Cache freshness** — The API handles caching. Do not implement client-side caching or try to determine if cache is stale.
5. **No topic invention** — If the API returns empty topics, report it to the user. Do NOT make up topics or fill in from your training data.
6. **Rate awareness** — The research pipeline calls external APIs (Reddit, HN, CoinGecko, Tavily, Groq). Do not spam the endpoint. One call per user interaction is sufficient.
7. **Scope discipline** — This skill discovers topics. It does NOT write scripts, generate videos, or publish content. Hand off to the appropriate skill for downstream work.
8. **Retry limit** — On API failure (non-200 status), retry up to 2 times. After 2 failures, report the error to the user.

---

## Error Handling

| Status Code | Meaning | Action |
|-------------|---------|--------|
| `200` | Success | Proceed to Step 3 |
| `400` | Bad request | Check niche string. Fix and retry once. |
| `429` | Rate limited | Wait 10 seconds, retry once. |
| `500` | Server error (likely an external API or LLM failure) | Retry once after 5 seconds. If still failing, report to user. |

---

## Example Exchange

**User:** What's trending in crypto right now?

**Agent identifies:** Niche is `crypto`. No manual topic. Character profile may be loaded.

**Agent executes:**

```
POST https://modfluencemonad.vercel.app/api/swarm/trends
Content-Type: application/json

{ "niche": "crypto" }
```

**API returns `200 OK`:**

```json
{
  "mode": "cached",
  "topics": [
    {
      "id": "topic-1708265267852-0",
      "title": "WLFI Surges 22.7%",
      "angle": "Why this small-cap coin is beating Bitcoin",
      "whyNow": "22.7% price surge in the last 24 hours",
      "hookIdea": "What's behind the sudden 22.7% spike?",
      "controversyScore": 4,
      "engagementScore": 85,
      "visualConcept": "Split-screen comparison of WLFI and BTC price charts",
      "sources": ["coingecko-wlfi"]
    },
    {
      "id": "topic-1708265267852-1",
      "title": "Logan Paul NFT Worth $155",
      "angle": "The dark side of NFT investing",
      "whyNow": "Logan Paul's $635,000 NFT is now worth $155",
      "hookIdea": "What happens when a $635,000 investment turns to dust?",
      "controversyScore": 5,
      "engagementScore": 95,
      "visualConcept": "Dramatic price drop animation on screen",
      "sources": ["reddit-abc123"]
    }
  ],
  "niche": "crypto"
}
```

**Agent presents:**

> Trending Topics for **crypto** (cached — last updated < 2hrs ago)
>
> ---
>
> **1. Logan Paul NFT Worth $155** — Engagement: 95/100 | Controversy: 5/5
> Angle: The dark side of NFT investing
> Why now: Logan Paul's $635,000 NFT is now worth $155
> Hook idea: "What happens when a $635,000 investment turns to dust?"
>
> **2. WLFI Surges 22.7%** — Engagement: 85/100 | Controversy: 4/5
> Angle: Why this small-cap coin is beating Bitcoin
> Why now: 22.7% price surge in the last 24 hours
> Hook idea: "What's behind the sudden 22.7% spike?"
>
> ---
>
> Pick a topic number to generate scripts, or tell me a different niche.
