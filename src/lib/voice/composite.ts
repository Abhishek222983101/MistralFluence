/**
 * Audio/video compositing via FFmpeg.
 *
 * Takes an MP4 video buffer and an MP3 voice buffer,
 * replaces the video's audio track with the voice,
 * and returns the composited MP4 buffer.
 *
 * Requires ffmpeg to be installed on the system (which it is on Arch).
 */

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WORK_DIR = join(tmpdir(), "mistralfluence-composite");

/**
 * Composite an MP3 voiceover onto an MP4 video, replacing the original audio.
 *
 * Strategy:
 *   ffmpeg -i video.mp4 -i voice.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -shortest -y output.mp4
 *
 * - `-map 0:v`  : take video stream from first input (LTX video)
 * - `-map 1:a`  : take audio stream from second input (ElevenLabs voice)
 * - `-c:v copy` : don't re-encode video (fast, lossless)
 * - `-c:a aac`  : encode voice as AAC for MP4 compatibility
 * - `-shortest` : trim to whichever stream is shorter
 *
 * @param mp4Buffer  - The raw MP4 video bytes (from LTX)
 * @param mp3Buffer  - The MP3 voiceover bytes (from ElevenLabs)
 * @returns          - The composited MP4 as a Buffer
 */
export async function compositeAudioVideo(
  mp4Buffer: Uint8Array,
  mp3Buffer: Uint8Array,
): Promise<Uint8Array> {
  const id = randomUUID().slice(0, 8);

  await mkdir(WORK_DIR, { recursive: true });

  const videoPath = join(WORK_DIR, `video_${id}.mp4`);
  const voicePath = join(WORK_DIR, `voice_${id}.mp3`);
  const outputPath = join(WORK_DIR, `output_${id}.mp4`);

  try {
    // Write inputs to temp files
    await writeFile(videoPath, mp4Buffer);
    await writeFile(voicePath, mp3Buffer);

    // Run ffmpeg
    await runFfmpeg([
      "-i", videoPath,
      "-i", voicePath,
      "-map", "0:v",
      "-map", "1:a",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-y",
      outputPath,
    ]);

    // Read composited output
    const result = await readFile(outputPath);
    return new Uint8Array(result);
  } finally {
    // Clean up temp files — fire-and-forget, don't block on errors
    await Promise.allSettled([
      unlink(videoPath),
      unlink(voicePath),
      unlink(outputPath),
    ]);
  }
}

/**
 * Run ffmpeg as a child process with a timeout.
 */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = execFile("ffmpeg", args, {
      timeout: 60_000, // 60s should be plenty for a 6-10s clip
      maxBuffer: 10 * 1024 * 1024, // 10MB stderr buffer
    }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`FFmpeg failed: ${error.message}\n${stderr}`));
      } else {
        resolve();
      }
    });

    // If proc itself fails to spawn
    proc.on("error", (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}
