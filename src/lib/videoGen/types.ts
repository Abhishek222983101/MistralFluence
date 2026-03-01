export interface VideoGenRequest {
  /** Text prompt describing the video to generate */
  prompt: string;
  /** Duration in seconds (default: 6) */
  duration?: number;
  /** Aspect ratio (default: "9:16" for Reels) */
  aspectRatio?: string;
  /** Style hint (e.g. "cinematic", "realistic", "artistic") */
  style?: string;
  /** Optional image URL for image-to-video */
  imageUrl?: string;
  /** Request native model audio if supported (Kling 2.6 pro mode) */
  voice?: boolean;
}

export interface VideoGenStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

export interface VideoGenAdapter {
  /** Unique model identifier */
  model: string;

  /** Submit a video generation request, returns a job ID */
  generateVideo(request: VideoGenRequest, apiKey: string): Promise<string>;

  /** Check the status of a video generation job */
  checkStatus(jobId: string, apiKey: string): Promise<VideoGenStatus>;
}
