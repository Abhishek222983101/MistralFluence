/**
 * Serves SKILL.md files for OpenClaw bot consumption.
 * GET /api/skills/monadfluence-character → returns character creation skill
 * GET /api/skills/monadfluence-prompt-compiler → returns prompt compiler skill
 * GET /api/skills/monadfluence-content-publish → returns content generation/publish skill
 * Also supports legacy moltfluence-* aliases for backward compatibility.
 */

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const SKILLS_DIR = join(process.cwd(), "skills");

const CANONICAL_SKILLS = [
  "monadfluence-character",
  "monadfluence-prompt-compiler",
  "monadfluence-content-publish",
];

const LEGACY_ALIASES: Record<string, string> = {
  "moltfluence-character": "monadfluence-character",
  "moltfluence-prompt-compiler": "monadfluence-prompt-compiler",
  "moltfluence-content-publish": "monadfluence-content-publish",
  "moltfluence-content": "monadfluence-content-publish",
};

export async function GET(
  req: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const resolvedName = LEGACY_ALIASES[name] ?? name;
  const available = [...CANONICAL_SKILLS, ...Object.keys(LEGACY_ALIASES)];

  if (!CANONICAL_SKILLS.includes(resolvedName)) {
    return NextResponse.json(
      {
        error: `Unknown skill: ${name}`,
        available,
        usage: "GET /api/skills/<skill-name>",
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
