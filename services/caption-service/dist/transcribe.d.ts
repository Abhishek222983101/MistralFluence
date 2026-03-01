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
export declare function transcribeAudio(wavPath: string): Promise<TranscriptionResult>;
