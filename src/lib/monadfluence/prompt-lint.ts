const MAX_PROMPT_LEN = 1600;

const BANNED_PHRASES = [
  "make it viral",
  "anything you want",
  "random",
  "do your best",
];

export function lintVideoPrompt(prompt: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const text = prompt.trim();

  if (text.length < 80) {
    issues.push("Prompt too short. Include explicit shot, setting, and actor constraints.");
  }
  if (text.length > MAX_PROMPT_LEN) {
    issues.push(`Prompt too long. Keep under ${MAX_PROMPT_LEN} characters.`);
  }

  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push(`Prompt contains vague phrase: \"${phrase}\"`);
    }
  }

  if (!lower.includes("hook")) {
    issues.push("Include a hook instruction for the first 2 seconds.");
  }
  if (!lower.includes("cta") && !lower.includes("call to action")) {
    issues.push("Include an explicit CTA instruction.");
  }
  if (
    !lower.includes("9:16") &&
    !lower.includes("vertical") &&
    !lower.includes("16:9") &&
    !lower.includes("landscape")
  ) {
    issues.push("Specify framing direction (9:16 vertical or 16:9 landscape).");
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
