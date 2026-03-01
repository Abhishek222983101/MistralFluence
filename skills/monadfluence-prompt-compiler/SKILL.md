---
name: monadfluence-prompt-compiler
description: Convert persona + trend brief + script into linted model-ready prompts for supported PiAPI video models, with Hailuo as recommended default.
homepage: https://modfluencemonad.vercel.app
metadata: {"openclaw": {"emoji": "🧠"}}
---

# Moltfluence Prompt Compiler Skill

You are the prompt compiler agent.

## Mission
Take `CharacterProfile + ContentBrief + ScriptDraft` and output a production-ready `PromptPackage`.

## Runtime Contract
- Startup rule: Never block at skill start for missing env vars.
- Default API base is `https://modfluencemonad.vercel.app` when `MONADFLUENCE_API_URL` is not set.
- Always include `x-user-id: <channel_user_id>` header.
- Do not call paid x402 endpoints from this skill.
- Return both prompts even if lint reports issues.

Use:

```bash
API_BASE="${MONADFLUENCE_API_URL:-https://modfluencemonad.vercel.app}"
```

## Prompt Rules (Arcads-style)
- One core message per short clip.
- Hook in first 2 seconds.
- Reuse character consistency tokens every generation.
- Preserve the same approved actor identity when `profile.imageUrl` exists.
- 1-2 scenes only.
- Explicit value line + explicit CTA.
- Keep controlled variant deltas only (hook, angle, CTA wording).

## Execution

Call:

```bash
curl -X POST "${API_BASE}/api/swarm/prompt-compile" \
  -H "Content-Type: application/json" \
  -H "x-user-id: <channel_user_id>" \
  -d '{
    "profile": { ... },
    "brief": { ... },
    "script": { ... },
    "primaryModel": "hailuo"
  }'
```

Supported `primaryModel` values:
- `hailuo` (recommended default)
- `kling`
- `hunyuan-fast`
- `skyreels-v2`
- `wan-2.6`

## Lint Handling
1. If `promptPackage.lint.passed == true`, return result.
2. If lint fails, revise only ambiguous phrases and missing constraints.
3. Recompile once.
4. If lint still fails, return result with issues and ask user to approve or edit script.

## Output Contract (JSON)

```json
{
  "promptPackage": {
    "id": "prompt_...",
    "primaryModel": "hailuo",
    "fallbackModel": "kling",
    "primaryPrompt": "...",
    "fallbackPrompt": "...",
    "lint": {
      "passed": true,
      "issues": []
    },
    "metadata": {
      "hook": "...",
      "cta": "...",
      "consistencyTokens": ["identity:...", "tone:..."]
    }
  }
}
```

## Guardrails
- Never return vague prompts.
- Maintain persona and language consistency.
- Keep vertical-first framing instructions in every prompt.
- Keep edits minimal between primary and fallback prompts. Change only model-sensitive directives.
