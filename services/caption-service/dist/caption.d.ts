import { type CaptionSegment } from "./subtitles.js";
export declare const SERVE_DIR: string;
export interface CaptionResult {
    captionedVideoUrl: string;
    transcript: CaptionSegment[];
    durationSec: number;
}
export declare function captionVideo(videoUrl: string, _style: string): Promise<CaptionResult>;
