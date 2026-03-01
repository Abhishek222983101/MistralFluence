import type { ImageGenAdapter, ImageGenRequest, ImageGenStatus } from "./types";

const PIAPI_BASE = "https://api.piapi.ai/api/v1";

const ASPECT_RATIO_MAP: Record<string, string> = {
  "9:16": "9:16",
  "16:9": "16:9",
  "1:1": "1:1",
};

export const midjourneyAdapter: ImageGenAdapter = {
  model: "midjourney",

  async generateImage(request: ImageGenRequest, apiKey: string): Promise<string> {
    const ar = ASPECT_RATIO_MAP[request.aspectRatio ?? "9:16"] ?? "9:16";
    // Midjourney uses "imagine" task_type with prompt including --ar flag
    const promptWithAr = `${request.prompt} --ar ${ar}`;

    const payload = {
      model: "midjourney",
      task_type: "imagine",
      input: {
        prompt: promptWithAr,
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
      throw new Error(`Midjourney API error ${res.status}: ${body}`);
    }

    const json: any = await res.json();
    const jobId = json.data?.task_id;
    if (!jobId) throw new Error("Midjourney API did not return a task ID");
    return String(jobId);
  },

  async checkStatus(jobId: string, apiKey: string): Promise<ImageGenStatus> {
    const res = await fetch(`${PIAPI_BASE}/task/${jobId}`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Midjourney status error ${res.status}: ${body}`);
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
          taskData.output?.images?.[0] ??
          taskData.output?.temporary_image_urls?.[0],
      };
    }

    if (status === "failed") {
      return {
        jobId,
        status: "failed",
        error: taskData.error?.message ?? taskData.error?.raw_message ?? "Midjourney generation failed",
      };
    }

    return { jobId, status: status === "processing" ? "processing" : "pending" };
  },
};
