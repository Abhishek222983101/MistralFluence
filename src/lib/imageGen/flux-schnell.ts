import type { ImageGenAdapter, ImageGenRequest, ImageGenStatus } from "./types";

const PIAPI_BASE = "https://api.piapi.ai/api/v1";

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 },
  "1:1": { width: 1024, height: 1024 },
};

export const fluxSchnellAdapter: ImageGenAdapter = {
  model: "flux-schnell",

  async generateImage(request: ImageGenRequest, apiKey: string): Promise<string> {
    const size = SIZE_MAP[request.aspectRatio ?? "9:16"] ?? SIZE_MAP["9:16"];

    const payload = {
      model: "Qubico/flux1-schnell",
      task_type: "txt2img",
      input: {
        prompt: request.prompt,
        width: size.width,
        height: size.height,
      },
      config: {
        service_mode: "public",
        webhook_config: { endpoint: "", secret: "" },
      },
    };

    const res = await fetch(`${PIAPI_BASE}/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Flux Schnell API error ${res.status}: ${body}`);
    }

    const json: any = await res.json();
    const jobId = json.data?.task_id;
    if (!jobId) throw new Error("Flux Schnell API did not return a task ID");
    return String(jobId);
  },

  async checkStatus(jobId: string, apiKey: string): Promise<ImageGenStatus> {
    const res = await fetch(`${PIAPI_BASE}/task/${jobId}`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Flux Schnell status error ${res.status}: ${body}`);
    }

    const json: any = await res.json();
    const taskData = json.data ?? {};
    const status = (taskData.status ?? "pending").toLowerCase();

    if (status === "completed") {
      return {
        jobId,
        status: "completed",
        imageUrl:
          taskData.output?.image_url ??
          taskData.output?.image ??
          taskData.output?.images?.[0]?.url ??
          taskData.output?.images?.[0],
      };
    }

    if (status === "failed") {
      return {
        jobId,
        status: "failed",
        error: taskData.error?.message ?? taskData.error?.raw_message ?? "Image generation failed",
      };
    }

    return { jobId, status: status === "processing" ? "processing" : "pending" };
  },
};
