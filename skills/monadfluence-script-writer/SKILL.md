---
skill: monadfluence-script-writer
version: 1.0.0
consumer: openclaw-tg-bot
trigger: script-generation-request
api_base: https://modfluencemonad.vercel.app
model: groq/llama-3.3-70b
---

# Skill: Character-Aware Script Generation

## Scope Gate

Activate this skill ONLY when the user request matches one of:

- Asks to generate scripts, write scripts, or create video scripts for a topic
- Has selected a topic (from content research or provided manually) and wants script variants
- Mentions scripting, script writing, or "write me a hook/body/CTA"

Do NOT activate for: topic research, content publishing, video editing, caption writing, scheduling, analytics, or character creation. If the user needs topics first, hand off to the `monadfluence-content-research` skill.

**Pre-conditions — all must be true before proceeding:**

1. A complete `CharacterProfile` is available (all fields required — see object reference below)
2. A finalized topic string is available (non-empty, coherent text)

If either is missing, STOP. Tell the user exactly what is needed. Do not guess or fabricate a character profile or topic.

---

## Execution Steps

### Step 1 — Validate Inputs

Confirm you have all required fields:

**CharacterProfile** (every field required):

| Field           | Type   | Constraint                         |
| --------------- | ------ | ---------------------------------- |
| `id`            | string | Non-empty character identifier     |
| `niche`         | string | e.g. `crypto`, `tech`, `memes`     |
| `characterType` | string | e.g. `analyst`, `degen`, `educator`|
| `vibe`          | string | e.g. `hype-beast`, `calm-explainer`|
| `role`          | string | e.g. `alpha caller`, `professor`   |
| `language`      | string | ISO 639-1 code, e.g. `en`, `es`   |
| `aggressiveness`| string | Must be exactly `"safe"` or `"spicy"` |

**Topic**: non-empty string. If it looks like random characters or is clearly nonsensical, reject it before calling the API.

**Mode**: determine from context:
- `"manual-topic"` — user provided the topic directly or picked it from a list
- `"auto-trends"` — topic originated from the content research pipeline's trending results

**Objective** (optional): extra context that shapes the CTA direction. Only include if the user provided it. Omit the field entirely otherwise.

If validation fails on any field, tell the user which field is invalid and what is expected. Do not call the API.

### Step 2 — Construct the Request Body

Build the exact JSON payload:

```json
{
  "characterProfile": {
    "id": "char_xyz",
    "niche": "crypto",
    "characterType": "analyst",
    "vibe": "hype-beast",
    "role": "alpha caller",
    "language": "en",
    "aggressiveness": "spicy"
  },
  "mode": "manual-topic",
  "topic": "Why 90% of altcoins will go to zero this cycle",
  "objective": "drive followers to check pinned post"
}
```

Rules:
- Do NOT add fields that are not listed above
- Do NOT include `"objective"` if the user did not provide one
- `aggressiveness` must be the literal string `"safe"` or `"spicy"` — no other values

### Step 3 — Call the API

```
POST https://modfluencemonad.vercel.app/api/swarm/scripts
Content-Type: application/json

<request body from Step 2>
```

Wait for the response. If the request fails (non-200 status), go to the Error Handling section.

### Step 4 — Parse and Validate the Response

Expected `200 OK` response:

```json
{
  "brief": {
    "id": "brief_abc123",
    "topic": "Why 90% of altcoins will go to zero this cycle",
    "characterId": "char_xyz",
    "createdAt": "2026-02-18T12:00:00Z"
  },
  "scripts": [
    {
      "id": "script_001",
      "title": "The Altcoin Graveyard",
      "hook": "90% of your bags are going to zero. Here's why.",
      "body": "Every cycle the same thing happens. Thousands of projects launch, pump on vibes, and then the music stops. The ones with no revenue, no users, no reason to exist — they evaporate. This cycle is no different. Look at the top 200 right now. Half of them have zero on-chain activity. The market isn't cruel, it's efficient.",
      "cta": "I broke down the 5 red flags I use to filter dead coins. Link in the pinned post.",
      "durationTargetSec": 22
    },
    {
      "id": "script_002",
      "title": "Altcoin Extinction Math",
      "hook": "Here's a stat that should terrify every altcoin holder.",
      "body": "Out of the top 100 coins from 2021, 83 are down over 90% and never recovered. That's not a bear market dip — that's death. The pattern repeats because most tokens exist to extract money, not create value. If your coin has no fees, no burns, no real demand — you're holding a receipt, not an asset. Step one, check on-chain revenue. Step two, check holder distribution. Step three, ask yourself: would this exist without a token?",
      "cta": "I made a full breakdown of which altcoins actually pass the test. Check the pinned post.",
      "durationTargetSec": 22
    },
    {
      "id": "script_003",
      "title": "I Watched a Portfolio Die",
      "hook": "I just watched someone's entire portfolio drop 97% in six months.",
      "body": "They showed me their holdings — 14 altcoins, all bought near the top. Not memecoins, legit-looking projects with roadmaps and partnerships. But when I checked the chains, nothing. No transactions, no TVL, no users. Just a token price slowly bleeding to zero. They didn't get scammed in the traditional sense. They got caught believing that a whitepaper equals a product. The market doesn't care about promises. It only prices in usage.",
      "cta": "I listed the exact filters I use before buying anything. Pinned post has the thread.",
      "durationTargetSec": 22
    }
  ]
}
```

Run these validations on the response:

1. `scripts` array exists and contains exactly **3** items
2. Each script has all 5 fields: `id`, `title`, `hook`, `body`, `cta`
3. `durationTargetSec` is `22` for every script
4. `brief` object exists with `id` and `topic`

If any validation fails, report the exact discrepancy to the user. Do NOT fabricate, pad, or patch missing scripts or fields.

### Step 5 — Present Scripts to the User

Display all 3 variants with clear labels. Use this exact format:

> Brief ID: `{brief.id}`
> Topic: {brief.topic}
>
> ---
>
> **Variant 1 — HOT TAKE** (bold, controversial opening, one core insight)
> Script ID: `{scripts[0].id}`
> Title: {scripts[0].title}
>
> **Hook (0–2s):**
> {scripts[0].hook}
>
> **Body (2–18s):**
> {scripts[0].body}
>
> **CTA (18–22s):**
> {scripts[0].cta}
>
> ---
>
> **Variant 2 — BREAKDOWN** (surprising fact, step-by-step explanation)
> Script ID: `{scripts[1].id}`
> Title: {scripts[1].title}
>
> **Hook (0–2s):**
> {scripts[1].hook}
>
> **Body (2–18s):**
> {scripts[1].body}
>
> **CTA (18–22s):**
> {scripts[1].cta}
>
> ---
>
> **Variant 3 — STORY** ("I just saw..." narrative arc)
> Script ID: `{scripts[2].id}`
> Title: {scripts[2].title}
>
> **Hook (0–2s):**
> {scripts[2].hook}
>
> **Body (2–18s):**
> {scripts[2].body}
>
> **CTA (18–22s):**
> {scripts[2].cta}

After presenting, ask the user if they want to pick a variant or regenerate.

---

## Timing Constraints

Total target duration: **22 seconds** of spoken delivery per script.

| Segment | Time Window | Purpose                          | Word Budget  |
| ------- | ----------- | -------------------------------- | ------------ |
| Hook    | 0–2s        | Stop the scroll, open a curiosity gap | 8–15 words   |
| Body    | 2–18s       | Deliver the core insight or narrative  | 60–90 words  |
| CTA     | 18–22s      | Direct a concrete next action          | 10–20 words  |

All script text is **written for voice delivery**. It must be speakable — natural cadence, no visual-only formatting. No URLs, hashtags, or emojis in any segment. These belong in captions, not in spoken scripts.

---

## Script Variant Definitions

The API always returns exactly 3 variants in this fixed order:

| #  | Variant    | Opening Style                                | Structure                                    | Energy              |
| -- | ---------- | -------------------------------------------- | -------------------------------------------- | ------------------- |
| 1  | HOT TAKE   | Provocative claim or contrarian statement    | Single core insight, no multi-step breakdown | High conviction     |
| 2  | BREAKDOWN  | Surprising stat or little-known fact         | Numbered steps or sequential logic           | Analytical, clear   |
| 3  | STORY      | "I just saw..." / "Someone showed me..."     | Narrative arc: setup → tension → lesson      | Relatable, emotional|

---

## Aggressiveness Handling

The `aggressiveness` field on the character profile controls the tone of all 3 script variants. The Groq LLM (llama-3.3-70b) handles this mapping server-side — the bot agent only needs to pass the correct value.

### `"spicy"`
- Confrontational, opinionated, zero hedging
- Uses direct "you" address, challenges the viewer
- Allowed: bold claims, strong language, provocative framing
- No softening qualifiers ("maybe", "I think", "some people say")
- Example hook: *"90% of your bags are going to zero. Here's why."*

### `"safe"`
- Informative, confident, authoritative — but not combative
- Uses inclusive framing ("let's look at", "here's what's happening")
- No insults, no fear-mongering, no inflammatory accusations
- Still engaging — not boring or hedged into meaninglessness
- Example hook: *"Most altcoins from last cycle never recovered. Let's look at why."*

---

## Quality Rules

The API generates scripts via character-tuned prompts. Verify these quality standards on every response. Flag violations to the user if any appear:

1. **No filler phrases** — Scripts must not contain: "in this video", "hey guys", "what's up everyone", "before we start", "without further ado", "let's dive in", "make sure to like and subscribe"
2. **No self-reference** — The script never mentions itself as a script, video, or piece of content
3. **Vibe match** — Language, slang, intensity, and energy must align with the character's `vibe` and `role`. A `hype-beast` should not sound like a `professor` and vice versa
4. **Language match** — All script text must be in the language specified by `characterProfile.language`. If `language` is `es`, every segment must be in Spanish
5. **Standalone segments** — Each of hook, body, and CTA must be coherent on its own. No segment should depend on reading another to make sense
6. **No hashtags or emojis** — These are for captions and post copy, not spoken scripts
7. **Actionable CTA** — The CTA must contain a concrete, specific next step (follow, check link, comment a keyword, save this post, etc.). Generic "stay tuned" is not acceptable
8. **Speakable text** — Read each segment aloud mentally. If it contains unpronounceable formatting, abbreviations that don't work verbally, or awkward phrasing, flag it

---

## Guardrails

1. **No local generation** — Do NOT generate scripts locally, with a different LLM, or by rewriting the API response. The Moltfluence API uses Groq (llama-3.3-70b) with character-tuned system prompts. Local generation will not match tone, structure, or quality.
2. **No response modification** — Present the API response as-is. Do not rewrite, "improve", rephrase, or editorialize the script text. If quality rules are violated, flag the issue — do not silently fix it.
3. **Complete profile required** — Do NOT call the endpoint with a partial character profile. Every field in `CharacterProfile` is required. If any field is missing, stop and ask the user.
4. **Retry limit** — On API failure (non-200 status), retry up to **2 times**. After 2 consecutive failures, report the error to the user with the HTTP status code and response body. Do not retry indefinitely.
5. **No profile leaking** — Do NOT echo the full character profile back to chat unless the user explicitly asks to see it. The profile may contain internal identifiers.
6. **Incomplete response handling** — If the API returns fewer than 3 scripts, report it as an incomplete response. Do NOT fill in missing variants yourself.
7. **Topic validation** — If the topic string is empty, whitespace-only, or clearly nonsensical (random characters, single letters), reject it before calling the API.
8. **No downstream actions** — This skill generates and presents scripts. It does NOT publish, schedule, edit video, generate captions, or select thumbnails. Hand off to the appropriate skill for any downstream work.

---

## Error Handling

| Status Code | Meaning                  | Action                                                                 |
| ----------- | ------------------------ | ---------------------------------------------------------------------- |
| `200`       | Success                  | Proceed to Step 4                                                      |
| `400`       | Bad request / validation | Check payload structure against Step 2. Fix and retry once.            |
| `422`       | Unprocessable entity     | A field value is invalid (e.g. bad aggressiveness). Fix and retry once.|
| `429`       | Rate limited             | Wait 10 seconds, retry once. If still 429, report to user.            |
| `500`       | Server error             | Retry once after 5 seconds. If still failing, report to user.         |
| Other       | Unexpected               | Do not retry. Report status code and body to user.                     |

---

## Example Exchange

**User:** Write scripts for the topic "Solana outage sparks L1 reliability debate" using my crypto character.

**Agent validates:** Character profile is available (previously loaded or provided). Topic is present and coherent. Mode is `manual-topic`. No objective specified.

**Agent executes:**

```
POST https://modfluencemonad.vercel.app/api/swarm/scripts
Content-Type: application/json

{
  "characterProfile": {
    "id": "char_sol_analyst",
    "niche": "crypto",
    "characterType": "analyst",
    "vibe": "calm-explainer",
    "role": "chain researcher",
    "language": "en",
    "aggressiveness": "safe"
  },
  "mode": "manual-topic",
  "topic": "Solana outage sparks L1 reliability debate"
}
```

**API returns `200 OK`:**

```json
{
  "brief": {
    "id": "brief_sol_9f3c",
    "topic": "Solana outage sparks L1 reliability debate",
    "characterId": "char_sol_analyst",
    "createdAt": "2026-02-18T14:30:00Z"
  },
  "scripts": [
    {
      "id": "script_sol_001",
      "title": "Uptime Is the New TVL",
      "hook": "Solana went down for 5 hours and nobody could move their money.",
      "body": "Here's the thing most people miss about L1 reliability. It's not about one outage. It's about the pattern. Solana has gone down multiple times in the last two years. Each time, DeFi protocols freeze, liquidations queue up, and trust erodes. Meanwhile, Ethereum hasn't had an unplanned outage in its entire history. At some point, uptime becomes the metric that separates infrastructure from experiments.",
      "cta": "I ranked the top 10 L1s by actual uptime percentage. Check the pinned post for the full list.",
      "durationTargetSec": 22
    },
    {
      "id": "script_sol_002",
      "title": "The 99.9% Myth",
      "hook": "Most L1 blockchains claim 99.9% uptime. Here's what that number actually hides.",
      "body": "99.9% sounds impressive until you do the math. That's 8.7 hours of downtime per year. Now consider what happens during those hours on a financial network. Liquidations freeze. Arbitrage breaks. Users panic-sell on other chains. One: check the chain's status page history, not its marketing site. Two: look at block production gaps — they don't lie. Three: compare validator response time during incidents. The chains that recover in minutes are built different from the ones that take hours.",
      "cta": "I put together a reliability scorecard for every major L1. It's in the pinned thread.",
      "durationTargetSec": 22
    },
    {
      "id": "script_sol_003",
      "title": "The Day the Chain Stopped",
      "hook": "I just watched a trader lose forty thousand dollars because a blockchain went offline.",
      "body": "They had a leveraged position on a Solana DEX. The chain went down, the oracle stopped updating, and by the time it came back, their position was liquidated at the worst possible price. They couldn't hedge, couldn't close, couldn't do anything. Five hours of watching a number get worse with no button to press. That's the real cost of downtime. It's not an inconvenience. It's financial exposure with no exit. The protocol didn't fail. The infrastructure under it did.",
      "cta": "I wrote a thread on how to protect positions during chain outages. Pinned on my profile.",
      "durationTargetSec": 22
    }
  ]
}
```

**Agent presents:**

> Brief ID: `brief_sol_9f3c`
> Topic: Solana outage sparks L1 reliability debate
>
> ---
>
> **Variant 1 — HOT TAKE**
> Script ID: `script_sol_001` — *Uptime Is the New TVL*
>
> **Hook (0–2s):**
> Solana went down for 5 hours and nobody could move their money.
>
> **Body (2–18s):**
> Here's the thing most people miss about L1 reliability. It's not about one outage. It's about the pattern. Solana has gone down multiple times in the last two years. Each time, DeFi protocols freeze, liquidations queue up, and trust erodes. Meanwhile, Ethereum hasn't had an unplanned outage in its entire history. At some point, uptime becomes the metric that separates infrastructure from experiments.
>
> **CTA (18–22s):**
> I ranked the top 10 L1s by actual uptime percentage. Check the pinned post for the full list.
>
> ---
>
> **Variant 2 — BREAKDOWN**
> Script ID: `script_sol_002` — *The 99.9% Myth*
>
> **Hook (0–2s):**
> Most L1 blockchains claim 99.9% uptime. Here's what that number actually hides.
>
> **Body (2–18s):**
> 99.9% sounds impressive until you do the math. That's 8.7 hours of downtime per year. Now consider what happens during those hours on a financial network. Liquidations freeze. Arbitrage breaks. Users panic-sell on other chains. One: check the chain's status page history, not its marketing site. Two: look at block production gaps — they don't lie. Three: compare validator response time during incidents. The chains that recover in minutes are built different from the ones that take hours.
>
> **CTA (18–22s):**
> I put together a reliability scorecard for every major L1. It's in the pinned thread.
>
> ---
>
> **Variant 3 — STORY**
> Script ID: `script_sol_003` — *The Day the Chain Stopped*
>
> **Hook (0–2s):**
> I just watched a trader lose forty thousand dollars because a blockchain went offline.
>
> **Body (2–18s):**
> They had a leveraged position on a Solana DEX. The chain went down, the oracle stopped updating, and by the time it came back, their position was liquidated at the worst possible price. They couldn't hedge, couldn't close, couldn't do anything. Five hours of watching a number get worse with no button to press. That's the real cost of downtime. It's not an inconvenience. It's financial exposure with no exit. The protocol didn't fail. The infrastructure under it did.
>
> **CTA (18–22s):**
> I wrote a thread on how to protect positions during chain outages. Pinned on my profile.
>
> ---
>
> Want to pick a variant, or regenerate with a different angle?

---

## Object Reference

### CharacterProfile

| Field           | Type   | Required | Description                                |
| --------------- | ------ | -------- | ------------------------------------------ |
| `id`            | string | Yes      | Unique character identifier                |
| `niche`         | string | Yes      | Content niche (crypto, tech, memes, etc.)  |
| `characterType` | string | Yes      | Archetype (analyst, degen, educator, etc.) |
| `vibe`          | string | Yes      | Personality energy (hype-beast, calm-explainer, etc.) |
| `role`          | string | Yes      | How the character positions themselves      |
| `language`      | string | Yes      | ISO 639-1 language code                    |
| `aggressiveness`| string | Yes      | `"safe"` or `"spicy"` — no other values    |

### Script

| Field              | Type   | Description                                  |
| ------------------ | ------ | -------------------------------------------- |
| `id`               | string | Unique script identifier                     |
| `title`            | string | Internal title for the script variant        |
| `hook`             | string | Opening line (0–2s, 8–15 words)              |
| `body`             | string | Core content (2–18s, 60–90 words)            |
| `cta`              | string | Call to action (18–22s, 10–20 words)          |
| `durationTargetSec`| number | Always `22`                                  |

### Brief

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `id`          | string | Unique brief identifier              |
| `topic`       | string | The topic that was scripted          |
| `characterId` | string | ID of the character used             |
| `createdAt`   | string | ISO 8601 timestamp of generation     |
