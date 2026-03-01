export interface ImageGenRequest {
  prompt: string;
  aspectRatio?: string;     // default: "9:16"
  style?: string;
}

export interface ImageGenStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
}

export interface ImageGenAdapter {
  model: string;
  generateImage(request: ImageGenRequest, apiKey: string): Promise<string>;  // returns jobId
  checkStatus(jobId: string, apiKey: string): Promise<ImageGenStatus>;
}
