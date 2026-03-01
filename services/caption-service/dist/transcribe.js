import Groq from "groq-sdk";
import fs from "node:fs";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export async function transcribeAudio(wavPath) {
    const file = fs.createReadStream(wavPath);
    const response = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
    });
    const words = response.words?.map((w) => ({
        word: w.word.trim(),
        start: w.start,
        end: w.end,
    })) ?? [];
    const durationSec = words.length > 0 ? words[words.length - 1].end : 0;
    return {
        words,
        text: response.text,
        durationSec,
    };
}
