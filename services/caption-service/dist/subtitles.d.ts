import type { WordTimestamp } from "./transcribe.js";
export interface CaptionSegment {
    text: string;
    start: number;
    end: number;
    words: WordTimestamp[];
}
/**
 * Group words into 3-5 word phrases.
 * Split on: 5 words max, >300ms gap, punctuation.
 */
export declare function groupWordsIntoPhrases(words: WordTimestamp[]): CaptionSegment[];
/**
 * Generate ASS subtitle content with \kf karaoke highlight tags.
 * Style: white text, black outline, yellow highlight sweep per word.
 */
export declare function generateASS(segments: CaptionSegment[], videoWidth?: number, videoHeight?: number): string;
