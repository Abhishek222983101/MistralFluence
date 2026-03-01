#!/bin/bash
set -e

# ─── CONFIG — fill these in before running ────────────────────────────────────
GROQ_API_KEY="your-groq-api-key-here"
CAPTION_SERVICE_SECRET=""   # leave blank to auto-generate
PORT=3100
PUBLIC_URL="http://167.86.87.188:${PORT}"
# ──────────────────────────────────────────────────────────────────────────────

echo "==> Installing system deps..."
apt-get update -qq
apt-get install -y -qq ffmpeg curl

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs

echo "==> Installing pm2..."
npm install -g pm2 --silent

echo "==> Creating directories..."
mkdir -p /opt/caption-service/src
mkdir -p /opt/caption-service/public/captioned

echo "==> Writing source files..."

cat > /opt/caption-service/package.json << 'EOF'
{
  "name": "caption-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "groq-sdk": "^0.8.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.30",
    "typescript": "^5.7.3"
  }
}
EOF

cat > /opt/caption-service/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
EOF

cat > /opt/caption-service/src/transcribe.ts << 'EOF'
import Groq from "groq-sdk";
import fs from "node:fs";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  words: WordTimestamp[];
  text: string;
  durationSec: number;
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function transcribeAudio(wavPath: string): Promise<TranscriptionResult> {
  const file = fs.createReadStream(wavPath);
  const response = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });
  const words: WordTimestamp[] = (response as any).words?.map((w: any) => ({
    word: w.word.trim(),
    start: w.start,
    end: w.end,
  })) ?? [];
  const durationSec = words.length > 0 ? words[words.length - 1].end : 0;
  return { words, text: response.text, durationSec };
}
EOF

cat > /opt/caption-service/src/subtitles.ts << 'EOF'
import type { WordTimestamp } from "./transcribe.js";

export interface CaptionSegment {
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
}

export function groupWordsIntoPhrases(words: WordTimestamp[]): CaptionSegment[] {
  if (words.length === 0) return [];
  const segments: CaptionSegment[] = [];
  let current: WordTimestamp[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    current.push(word);
    const isLastWord = i === words.length - 1;
    const nextWord = words[i + 1];
    const gap = nextWord ? nextWord.start - word.end : 0;
    const endsWithPunctuation = /[.!?,;:]$/.test(word.word);
    const hitMaxWords = current.length >= 5;
    if (isLastWord || hitMaxWords || gap > 0.3 || endsWithPunctuation) {
      segments.push({
        text: current.map((w) => w.word).join(" "),
        start: current[0].start,
        end: current[current.length - 1].end,
        words: [...current],
      });
      current = [];
    }
  }
  return segments;
}

export function generateASS(segments: CaptionSegment[], videoWidth = 1080, videoHeight = 1920): string {
  const header = `[Script Info]
Title: Caption
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,2,40,40,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = segments.map((seg) => {
    const startTime = formatASSTime(seg.start);
    const endTime = formatASSTime(seg.end);
    const karaokeText = seg.words
      .map((w) => {
        const durationCs = Math.round((w.end - w.start) * 100);
        return `{\\kf${durationCs}}${w.word}`;
      })
      .join(" ");
    return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${karaokeText}`;
  });

  return header + "\n" + events.join("\n") + "\n";
}

function formatASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
EOF

cat > /opt/caption-service/src/caption.ts << 'EOF'
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { transcribeAudio } from "./transcribe.js";
import { groupWordsIntoPhrases, generateASS, type CaptionSegment } from "./subtitles.js";

const exec = promisify(execFile);

export const SERVE_DIR = process.env.SERVE_DIR ?? "/opt/caption-service/public/captioned";

export interface CaptionResult {
  captionedVideoUrl: string;
  transcript: CaptionSegment[];
  durationSec: number;
}

export async function captionVideo(videoUrl: string, _style: string): Promise<CaptionResult> {
  const jobId = crypto.randomUUID().slice(0, 12);
  const tmpDir = `/tmp/caption-${jobId}`;
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(SERVE_DIR, { recursive: true });

  const videoPath = path.join(tmpDir, "input.mp4");
  const audioPath = path.join(tmpDir, "audio.wav");
  const assPath = path.join(tmpDir, "captions.ass");
  const outputFilename = `${jobId}.mp4`;
  const outputPath = path.join(SERVE_DIR, outputFilename);

  try {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    fs.writeFileSync(videoPath, Buffer.from(await videoRes.arrayBuffer()));

    await exec("ffmpeg", ["-i", videoPath, "-vn", "-ar", "16000", "-ac", "1", audioPath]);

    const transcription = await transcribeAudio(audioPath);
    const segments = groupWordsIntoPhrases(transcription.words);

    fs.writeFileSync(assPath, generateASS(segments), "utf-8");

    await exec("ffmpeg", [
      "-i", videoPath,
      "-vf", `ass=${assPath}`,
      "-c:v", "libx264", "-crf", "23", "-preset", "medium",
      "-c:a", "copy",
      outputPath,
    ], { timeout: 120_000 });

    const publicUrl = process.env.PUBLIC_URL?.replace(/\/+$/, "") ?? "";
    return {
      captionedVideoUrl: `${publicUrl}/captioned/${outputFilename}`,
      transcript: segments,
      durationSec: transcription.durationSec,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
EOF

cat > /opt/caption-service/src/index.ts << 'EOF'
import express from "express";
import { captionVideo, SERVE_DIR } from "./caption.js";

const app = express();
app.use(express.json());
app.use("/captioned", express.static(SERVE_DIR));

const SECRET = process.env.CAPTION_SERVICE_SECRET ?? "";

app.post("/caption", async (req, res) => {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!SECRET || auth !== SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { videoUrl, style } = req.body ?? {};
  if (!videoUrl || typeof videoUrl !== "string") {
    res.status(400).json({ error: "videoUrl is required" });
    return;
  }
  try {
    const result = await captionVideo(videoUrl, style ?? "tiktok-highlight");
    res.json(result);
  } catch (err) {
    console.error("[caption] Error:", (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = parseInt(process.env.PORT ?? "3100", 10);
app.listen(PORT, () => {
  console.log(`Caption service listening on :${PORT}`);
  console.log(`Serving videos from: ${SERVE_DIR}`);
});
EOF

echo "==> Installing npm dependencies..."
cd /opt/caption-service
npm install --silent

echo "==> Building TypeScript..."
npx tsc

echo "==> Generating secret..."
if [ -z "$CAPTION_SERVICE_SECRET" ]; then
  CAPTION_SERVICE_SECRET=$(openssl rand -hex 32)
  echo ""
  echo "  *** Generated CAPTION_SERVICE_SECRET: ${CAPTION_SERVICE_SECRET} ***"
  echo "  *** Save this — you need it in your Vercel env vars ***"
  echo ""
fi

echo "==> Writing .env..."
cat > /opt/caption-service/.env << ENVEOF
GROQ_API_KEY=${GROQ_API_KEY}
CAPTION_SERVICE_SECRET=${CAPTION_SERVICE_SECRET}
PUBLIC_URL=${PUBLIC_URL}
PORT=${PORT}
SERVE_DIR=/opt/caption-service/public/captioned
ENVEOF

echo "==> Starting with pm2..."
cat > /opt/caption-service/ecosystem.config.cjs << ECOEOF
module.exports = {
  apps: [{
    name: "caption-service",
    script: "/opt/caption-service/dist/index.js",
    env: {
      NODE_ENV: "production",
      GROQ_API_KEY: "${GROQ_API_KEY}",
      CAPTION_SERVICE_SECRET: "${CAPTION_SERVICE_SECRET}",
      PUBLIC_URL: "${PUBLIC_URL}",
      PORT: "${PORT}",
      SERVE_DIR: "/opt/caption-service/public/captioned"
    }
  }]
};
ECOEOF

pm2 delete caption-service 2>/dev/null || true
pm2 start /opt/caption-service/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo ""
echo "==> Done! Testing health endpoint..."
sleep 2
curl -s http://localhost:${PORT}/health

echo ""
echo "==> Caption service is live at: ${PUBLIC_URL}"
echo "==> CAPTION_SERVICE_URL to set in Vercel: ${PUBLIC_URL}"
echo "==> CAPTION_SERVICE_SECRET: ${CAPTION_SERVICE_SECRET}"
