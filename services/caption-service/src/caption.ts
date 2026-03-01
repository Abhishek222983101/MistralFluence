import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { transcribeAudio } from "./transcribe.js";
import { groupWordsIntoPhrases, generateASS, type CaptionSegment } from "./subtitles.js";

const exec = promisify(execFile);

// Directory where captioned videos are saved and served from
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
    // 1. Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    fs.writeFileSync(videoPath, videoBuffer);

    // 2. Extract audio
    await exec("ffmpeg", [
      "-i", videoPath,
      "-vn", "-ar", "16000", "-ac", "1",
      audioPath,
    ]);

    // 3. Transcribe with Groq Whisper
    const transcription = await transcribeAudio(audioPath);

    // 4. Group words into phrases
    const segments = groupWordsIntoPhrases(transcription.words);

    // 5. Generate ASS subtitle file
    const assContent = generateASS(segments);
    fs.writeFileSync(assPath, assContent, "utf-8");

    // 6. Burn subtitles into video — output goes straight to SERVE_DIR
    await exec("ffmpeg", [
      "-i", videoPath,
      "-vf", `ass=${assPath}`,
      "-c:v", "libx264",
      "-crf", "23",
      "-preset", "medium",
      "-c:a", "copy",
      outputPath,
    ], { timeout: 120_000 });

    // 7. Build public URL
    const publicUrl = process.env.PUBLIC_URL?.replace(/\/+$/, "") ?? "";
    const captionedVideoUrl = `${publicUrl}/captioned/${outputFilename}`;

    return {
      captionedVideoUrl,
      transcript: segments,
      durationSec: transcription.durationSec,
    };
  } finally {
    // 8. Clean up only the tmp working dir (output stays in SERVE_DIR)
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
