import { Mistral } from "@mistralai/mistralai";
import type { CharacterProfile, ContentBrief, ScriptDraft } from "./monadfluence/types";
import type { ScoredItem, SynthesizedTopic } from "./research/types";

let mistralClient: Mistral | null = null;

function getMistralClient(): Mistral {
  if (!mistralClient) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is missing");
    }
    mistralClient = new Mistral({ apiKey });
  }
  return mistralClient;
}

const MODEL = "mistral-large-latest";

export async function generateImagePrompt(profile: Partial<CharacterProfile>): Promise<string> {
  const fallbackDesc = profile.characterType || "A futuristic influencer";
  
  if (!process.env.MISTRAL_API_KEY) {
    console.warn("MISTRAL_API_KEY missing, using fallback image prompt");
    return `A ${profile.vibe || "cool"} ${profile.role || "character"}. ${fallbackDesc}. High quality, 8k, photorealistic portrait.`;
  }

  const systemPrompt = `
    You are an expert AI art director.
    Create a detailed image generation prompt for a character portrait based on the user's description.
    Focus on visual details: appearance, clothing, lighting, background, and mood.
    Return ONLY the prompt string. No "Here is the prompt" prefix.
  `;

  const userPrompt = `
    Description/Name: ${fallbackDesc}
    Role: ${profile.role}
    Vibe: ${profile.vibe}
    Niche: ${profile.niche}
    Style: ${profile.styleGuide || "Cinematic, photorealistic, 8k"}
  `;


  try {
    const mistral = getMistralClient();
    const completion = await mistral.chat.complete({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content.trim() || "";
    }
    return "";
  } catch (error) {
    console.error("Mistral image prompt gen failed:", error);
    return `A ${profile.vibe || "cool"} ${profile.role || "character"}. ${fallbackDesc}. High quality, 8k, photorealistic portrait.`;
  }
}

// ─── Topic Synthesis ──────────────────────────────────────────────
// Takes scored research items and synthesizes 5 video-worthy topics.
// This is NOT "summarize articles" — it's viral short-form video strategy.

export async function synthesizeTopics(
  niche: string,
  scoredItems: ScoredItem[]
): Promise<SynthesizedTopic[]> {
  if (!process.env.MISTRAL_API_KEY) {
    console.warn("[llm] MISTRAL_API_KEY missing, cannot synthesize topics");
    return [];
  }

  if (scoredItems.length === 0) {
    console.warn("[llm] No scored items to synthesize");
    return [];
  }

  // Format top items for the prompt (max 20)
  const topItems = scoredItems.slice(0, 20);
  const formattedItems = topItems
    .map((item, i) => {
      const parts = [
        `${i + 1}. "${item.title}"`,
        `   Source: ${item.source}${item.subreddit ? ` (r/${item.subreddit})` : ""}`,
        `   Score: ${item.score} | Comments: ${item.comments} | FinalScore: ${item.finalScore}/100`,
      ];
      if (item.raw.price_change_24h_pct !== undefined) {
        parts.push(`   Price Change 24h: ${item.raw.price_change_24h_pct}%`);
      }
      if (item.raw.content_snippet) {
        parts.push(`   Context: ${String(item.raw.content_snippet).slice(0, 150)}`);
      }
      return parts.join("\\n");
    })
    .join("\\n\\n");

  const systemPrompt = `You are a viral short-form video strategist specializing in ${niche}.

CONTEXT: You are analyzing real-time data from Reddit, Hacker News, CoinGecko, and web sources to find topics that will perform on Instagram Reels and TikTok in the next 24-48 hours.

RESEARCH DATA (top ${topItems.length} items by engagement):

${formattedItems}

YOUR TASK:
Extract exactly 5 video-worthy topics. For each topic, return a JSON object with these fields:

1. "title": One-line topic (max 10 words, punchy)
2. "angle": The specific take that makes this a video, not a blog post
3. "whyNow": What happened in the last 24h that makes this timely
4. "hookIdea": The exact opening line for a 2-second scroll-stop hook
5. "controversyScore": 1-5, how debate-worthy is this take
6. "engagementScore": 1-100, predicted engagement (comments > likes > views)
7. "visualConcept": What should the viewer SEE (not hear) in the video
8. "sourceIndices": Array of 1-based indices from the research data that contributed

RULES:
- Topics must be TIMELY (happened today/yesterday, not evergreen)
- Each topic must have a CLEAR opposing view (debate = engagement)
- Hooks must create curiosity gaps or pattern interrupts
- NO generic advice topics ("5 tips for...", "how to...")
- NO topics requiring complex graphics/charts (this is talking-head video)
- Rank by predicted engagement (comments > likes > views)
- You can combine multiple research items into a single topic if they share a narrative

Return a JSON object with a single key "topics" containing an array of exactly 5 topic objects.`;

  try {
    const mistral = getMistralClient();
    const completion = await mistral.chat.complete({
      model: MODEL,
      temperature: 0.7,
      responseFormat: { type: "json_object" },
      maxTokens: 2000,
      messages: [{ role: "user", content: systemPrompt }],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content) {
      console.error("[llm] Empty response from Mistral");
      return [];
    }

    const parsed = JSON.parse(content);
    const rawTopics = parsed.topics || parsed.Topics || [];

    // Normalize and add IDs
    return rawTopics.slice(0, 5).map((t: any, i: number): SynthesizedTopic => ({
      id: `topic-${Date.now()}-${i}`,
      title: String(t.title || "Untitled").slice(0, 80),
      angle: String(t.angle || ""),
      whyNow: String(t.whyNow || t.why_now || ""),
      hookIdea: String(t.hookIdea || t.hook_idea || t.hook || ""),
      controversyScore: clamp(Number(t.controversyScore || t.controversy_score || 3), 1, 5),
      engagementScore: clamp(Number(t.engagementScore || t.engagement_score || 50), 1, 100),
      visualConcept: String(t.visualConcept || t.visual_concept || ""),
      sources: (t.sourceIndices || t.source_indices || []).map((idx: number) =>
        topItems[idx - 1]?.id || `unknown-${idx}`
      ),
    }));
  } catch (err) {
    console.error("[llm] synthesizeTopics failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Character-Aware Script Generation ────────────────────────────
// Takes a character profile + content brief and generates 3 script variants.
// Each script is structured: hook (0-2s) / body (2-18s) / CTA (18-22s).

export async function generateCreativeScripts(
  profile: CharacterProfile,
  brief: ContentBrief
): Promise<ScriptDraft[]> {
  if (!process.env.MISTRAL_API_KEY) {
    console.warn("[llm] MISTRAL_API_KEY missing, cannot generate scripts");
    return [];
  }

  const systemPrompt = `You are writing a script for an AI influencer with this persona:

CHARACTER:
- Role: ${profile.role}
- Vibe: ${profile.vibe}
- Language: ${profile.language}
- Aggressiveness: ${profile.aggressiveness}
- Niche: ${profile.niche}
- Style Guide: ${profile.styleGuide || "Engaging, authentic, scroll-stopping"}

TOPIC: ${brief.topic}
${brief.objective ? `OBJECTIVE: ${brief.objective}` : ""}

Write exactly 3 script variants. Each MUST follow this structure:

VARIANT 1 (HOT TAKE):
- A bold, slightly controversial opening + one core insight with proof + specific action CTA

VARIANT 2 (BREAKDOWN):
- A surprising fact or stat opening + step-by-step explanation + share prompt CTA

VARIANT 3 (STORY):
- "I just saw..." or "This happened today..." opening + narrative arc with personal reaction + question CTA

Return a JSON object with a single key "scripts" containing an array of 3 objects, each with:
- "title": Short descriptive title for this variant (max 8 words)
- "hook": The opening line (0-2 seconds, must stop the scroll)
- "body": The main content (2-18 seconds, one core message)
- "cta": The closing call-to-action (18-22 seconds)

RULES:
- Write in ${profile.language}
- Match the ${profile.vibe} energy level throughout
${profile.aggressiveness === "spicy"
    ? "- Use edgy, provocative, confrontational language. Be bold and polarizing."
    : "- Keep it informative but engaging. Be authoritative without being aggressive."}
- Each script must be speakable in under 22 seconds total
- NO filler phrases, NO "in this video", NO "today we're going to"
- Every sentence must earn its place — remove anything skippable
- Hooks must create curiosity gaps or pattern interrupts
- The body should feel like insider knowledge being shared`;

  try {
    const mistral = getMistralClient();
    const completion = await mistral.chat.complete({
      model: MODEL,
      temperature: 0.8,
      responseFormat: { type: "json_object" },
      maxTokens: 1500,
      messages: [{ role: "user", content: systemPrompt }],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content) {
      console.error("[llm] Empty response from Mistral for scripts");
      return [];
    }

    const parsed = JSON.parse(content);
    const rawScripts = parsed.scripts || parsed.Scripts || [];

    return rawScripts.slice(0, 3).map((s: any, i: number): ScriptDraft => ({
      id: `script-${Date.now()}-${i}`,
      title: String(s.title || `Variant ${i + 1}`).slice(0, 60),
      hook: String(s.hook || ""),
      body: String(s.body || ""),
      cta: String(s.cta || ""),
      durationTargetSec: 22,
    }));
  } catch (err) {
    console.error("[llm] generateCreativeScripts failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
