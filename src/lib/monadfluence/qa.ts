import type { GenerationRecord } from "./types";

export function runVideoQa(record: GenerationRecord, status: { videoUrl?: string; duration?: number }): {
  passed: boolean;
  checks: Record<string, { passed: boolean; detail: string }>;
} {
  const checks: Record<string, { passed: boolean; detail: string }> = {
    nonEmptyVideoUrl: {
      passed: Boolean(status.videoUrl && status.videoUrl.trim().length > 0),
      detail: status.videoUrl ? "videoUrl present" : "videoUrl missing",
    },
    durationCompliance: {
      passed: true,
      detail: "provider duration unavailable",
    },
    aspectRatioCompliance: {
      passed: ["9:16", "16:9", "1:1"].includes(record.aspectRatio),
      detail: `requested ${record.aspectRatio}`,
    },
  };

  if (typeof status.duration === "number") {
    const diff = Math.abs(status.duration - record.duration);
    checks.durationCompliance = {
      passed: diff <= 2,
      detail: `target ${record.duration}s, got ${status.duration}s`,
    };
  }

  const passed = Object.values(checks).every((c) => c.passed);
  return { passed, checks };
}

export function validateCaption(caption: string): { passed: boolean; detail: string } {
  const trimmed = caption.trim();
  if (trimmed.length === 0) {
    return { passed: true, detail: "caption optional" };
  }
  if (trimmed.length > 2200) {
    return { passed: false, detail: "caption exceeds 2200 characters" };
  }
  return { passed: true, detail: "caption length valid" };
}
