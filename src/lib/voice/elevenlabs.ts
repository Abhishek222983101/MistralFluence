/**
 * ElevenLabs TTS integration for MistralFluence.
 *
 * Maps character vibe + role to a curated voice, then generates
 * an MP3 voiceover from script text.
 *
 * Uses the official ElevenLabs Node SDK (elevenlabs ^1.59.0).
 */

import { ElevenLabsClient } from "elevenlabs";

/* ------------------------------------------------------------------ */
/*  Voice mapping: vibe × role → ElevenLabs voice ID                  */
/* ------------------------------------------------------------------ */

/**
 * Curated voice IDs from the ElevenLabs public voice library.
 * Each voice was chosen to match the "feel" of a particular
 * character archetype used in the MistralFluence pipeline.
 *
 * Fallback: "Adam" (pNInz6obpgDQGcFmaJgB) — deep, neutral male.
 */
const VOICE_MAP: Record<string, Record<string, string>> = {
  savage: {
    commentator: "pNInz6obpgDQGcFmaJgB", // Adam — deep, assertive
    educator: "ErXwobaYiN019PkySvjV",     // Antoni — warm but direct
    entertainer: "VR6AewLTigWG4xSOukaG",  // Arnold — bold, commanding
    default: "pNInz6obpgDQGcFmaJgB",      // Adam
  },
  confident: {
    commentator: "29vD33N1CtxCmqQRPOHJ", // Drew — smooth, authoritative
    educator: "ErXwobaYiN019PkySvjV",     // Antoni — warm, trustworthy
    entertainer: "VR6AewLTigWG4xSOukaG",  // Arnold — energetic
    default: "29vD33N1CtxCmqQRPOHJ",      // Drew
  },
  chaotic: {
    commentator: "VR6AewLTigWG4xSOukaG",  // Arnold — bold, energetic
    educator: "pNInz6obpgDQGcFmaJgB",     // Adam — grounded contrast
    entertainer: "VR6AewLTigWG4xSOukaG",  // Arnold
    default: "VR6AewLTigWG4xSOukaG",      // Arnold
  },
  chill: {
    commentator: "ErXwobaYiN019PkySvjV",  // Antoni — relaxed, smooth
    educator: "ErXwobaYiN019PkySvjV",     // Antoni
    entertainer: "29vD33N1CtxCmqQRPOHJ",  // Drew — calm, collected
    default: "ErXwobaYiN019PkySvjV",      // Antoni
  },
  calm: {
    commentator: "ErXwobaYiN019PkySvjV",  // Antoni
    educator: "ErXwobaYiN019PkySvjV",     // Antoni
    entertainer: "29vD33N1CtxCmqQRPOHJ",  // Drew
    default: "ErXwobaYiN019PkySvjV",      // Antoni
  },
  professional: {
    commentator: "29vD33N1CtxCmqQRPOHJ",  // Drew — polished
    educator: "ErXwobaYiN019PkySvjV",     // Antoni — clear
    entertainer: "pNInz6obpgDQGcFmaJgB",  // Adam — neutral
    default: "29vD33N1CtxCmqQRPOHJ",      // Drew
  },
  edgy: {
    commentator: "pNInz6obpgDQGcFmaJgB",  // Adam — deep, edgy
    educator: "VR6AewLTigWG4xSOukaG",     // Arnold — bold
    entertainer: "VR6AewLTigWG4xSOukaG",  // Arnold
    default: "pNInz6obpgDQGcFmaJgB",      // Adam
  },
};

const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam

/**
 * Resolve the best ElevenLabs voice ID for a character's vibe + role.
 */
export function resolveVoiceId(vibe?: string, role?: string): string {
  const vibeLower = (vibe ?? "").toLowerCase();
  const roleLower = (role ?? "").toLowerCase();

  const vibeEntry = VOICE_MAP[vibeLower];
  if (!vibeEntry) return DEFAULT_VOICE_ID;

  return vibeEntry[roleLower] ?? vibeEntry.default ?? DEFAULT_VOICE_ID;
}

/* ------------------------------------------------------------------ */
/*  Core TTS function                                                 */
/* ------------------------------------------------------------------ */

/**
 * Generate an MP3 voiceover buffer from script text.
 *
 * @param text     - The full script text (hook + body + CTA)
 * @param voiceId  - ElevenLabs voice ID (use resolveVoiceId() to pick one)
 * @returns        - MP3 audio as a Uint8Array
 */
export async function generateVoiceover(
  text: string,
  voiceId: string,
): Promise<Uint8Array> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  const client = new ElevenLabsClient({ apiKey });

  // The SDK's convert() returns a Readable stream
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: "eleven_multilingual_v2",
    output_format: "mp3_44100_128",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.4,
      use_speaker_boost: true,
    },
  });

  // Collect the stream into a single Uint8Array
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(new Uint8Array(chunk));
  }

  // Concatenate all chunks into a single Uint8Array
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const mp3Buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    mp3Buffer.set(chunk, offset);
    offset += chunk.length;
  }

  if (mp3Buffer.length === 0) {
    throw new Error("ElevenLabs returned empty audio");
  }

  return mp3Buffer;
}

/**
 * Convenience: resolve voice from character traits and generate voiceover.
 */
export async function generateCharacterVoiceover(
  scriptText: string,
  vibe?: string,
  role?: string,
): Promise<{ mp3Buffer: Uint8Array; voiceId: string }> {
  const voiceId = resolveVoiceId(vibe, role);
  const mp3Buffer = await generateVoiceover(scriptText, voiceId);
  return { mp3Buffer, voiceId };
}
