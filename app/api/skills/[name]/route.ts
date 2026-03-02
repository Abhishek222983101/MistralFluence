/**
 * Serves SKILL.md files for OpenClaw bot consumption.
 * GET /api/skills/mistralfluence-agent → returns the unified MistralFluence agent skill
 * Legacy aliases (monadfluence-*, moltfluence-*) all redirect to the unified skill.
 */

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const SKILLS_DIR = join(process.cwd(), "skills");

const CANONICAL_SKILL = "mistralfluence-agent";

const LEGACY_ALIASES: Record<string, string> = {
  "monadfluence-character": CANONICAL_SKILL,
  "monadfluence-prompt-compiler": CANONICAL_SKILL,
  "monadfluence-content-publish": CANONICAL_SKILL,
  "monadfluence-content": CANONICAL_SKILL,
  "monadfluence-content-research": CANONICAL_SKILL,
  "monadfluence-script-writer": CANONICAL_SKILL,
  "moltfluence-character": CANONICAL_SKILL,
  "moltfluence-prompt-compiler": CANONICAL_SKILL,
  "moltfluence-content-publish": CANONICAL_SKILL,
  "moltfluence-content": CANONICAL_SKILL,
};

export async function GET(
  req: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const resolvedName = LEGACY_ALIASES[name] ?? name;

  if (resolvedName !== CANONICAL_SKILL) {
    return NextResponse.json(
      {
        error: `Unknown skill: ${name}`,
        available: [CANONICAL_SKILL, ...Object.keys(LEGACY_ALIASES)],
        usage: "GET /api/skills/mistralfluence-agent",
      },
      { status: 404 },
    );
  }

  try {
    const skillPath = join(SKILLS_DIR, resolvedName, "SKILL.md");
    const content = readFileSync(skillPath, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: `Failed to read skill: ${name}` },
      { status: 500 },
    );
  }
}
