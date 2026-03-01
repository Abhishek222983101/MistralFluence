"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type VideoJob = {
  jobId: string;
  model: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
};

type Props = {
  onVideoReady: (url: string) => void;
};

const VIDEO_MODELS = [{ id: "ltx", label: "LTX-2-fast", note: "Default" }] as const;

type UiVideoModel = (typeof VIDEO_MODELS)[number]["id"];

export default function VideoGenerator({ onVideoReady }: Props) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<UiVideoModel>("ltx");
  const [duration, setDuration] = useState(6);
  const [characterId, setCharacterId] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "polling" | "done" | "error">("idle");
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{ used?: number; remaining?: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollJobStatus = useCallback(
    (jobId: string, jobModel: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/x402/generate-video/${jobId}`);
          if (!res.ok) return;

          const data = await res.json();

          if (data.retrying && data.retryJobId) {
            setJob({
              jobId: data.retryJobId,
              model: data.model,
              status: "processing",
            });
            pollJobStatus(data.retryJobId, data.model);
            return;
          }

          setJob({ jobId, model: jobModel, status: data.status, videoUrl: data.videoUrl, error: data.error });

          if (data.status === "completed" || data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setStatus(data.status === "completed" ? "done" : "error");

            if (data.status === "completed" && data.videoUrl) {
              onVideoReady(data.videoUrl);
            }
            if (data.status === "failed") {
              setError(data.error ?? "Video generation failed");
            }
          }
        } catch {
          // keep polling
        }
      }, 4000);
    },
    [onVideoReady],
  );

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setStatus("submitting");
    setError(null);
    setJob(null);
    setQuotaInfo(null);

    try {
      const genRes = await fetch("/api/x402/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration,
          characterId: characterId.trim() || undefined,
        }),
      });

      const genData = await genRes.json();

      if (genRes.status === 402) {
        const microAmount = Number(genData.accepts?.[0]?.amount ?? genData.accepts?.[0]?.maxAmountRequired ?? 0);
        throw new Error(
          `Payment required: $${microAmount > 0 ? (microAmount / 1e6).toFixed(2) : "?"} USDC. Complete x402 payment then retry.`,
        );
      }

      if (!genRes.ok) {
        const lintIssues = Array.isArray(genData?.lint?.issues) ? ` ${genData.lint.issues.join(" | ")}` : "";
        throw new Error(`${genData?.error ?? "Failed to submit video generation"}${lintIssues}`);
      }

      setQuotaInfo({
        used: genData.quotaUsed,
        remaining: genData.quotaRemaining,
      });

      if (genData.status === "completed" && genData.videoUrl) {
        setStatus("done");
        setJob({
          jobId: genData.jobId,
          model: genData.model,
          status: "completed",
          videoUrl: genData.videoUrl,
        });
        onVideoReady(genData.videoUrl);
        return;
      }

      setStatus("polling");
      setJob({ jobId: genData.jobId, model: genData.model, status: "pending" });
      pollJobStatus(genData.jobId, genData.model);
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  function handleReset() {
    if (pollRef.current) clearInterval(pollRef.current);

    setStatus("idle");
    setJob(null);
    setError(null);
    setPrompt("");
    setQuotaInfo(null);
  }

  const isGenerating = status === "submitting" || status === "polling";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white">Generate Video</h2>
        {status === "polling" && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-surface-dark-highlight border border-white/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[10px] font-bold text-slate-400">GENERATING</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-dark p-5 space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Prompt</p>
          <textarea
            placeholder="Hook: stop scrolling... CTA: comment if you want part 2. Vertical 9:16, close-up, realistic movement..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating || status === "done"}
            rows={4}
            className="w-full rounded-lg bg-black/20 border border-white/10 text-white text-sm px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all disabled:opacity-50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Model</p>
            <div className="grid grid-cols-1 gap-2">
              {VIDEO_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  disabled={isGenerating || status === "done"}
                  className={`h-9 rounded-lg text-xs font-bold transition-all ${
                    model === m.id
                      ? "bg-primary/10 border border-primary/20 text-primary"
                      : "bg-black/20 border border-white/10 text-text-muted hover:text-white hover:border-white/20"
                  } disabled:opacity-50`}
                >
                  {m.label}{" "}
                  <span className="text-[10px] opacity-80">
                    {m.note}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Duration</p>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isGenerating || status === "done"}
              className="w-full h-9 rounded-lg bg-black/20 border border-white/10 text-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
            >
              <option value={6}>6 sec</option>
              <option value={10}>10 sec</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Character ID</p>
            <input
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              disabled={isGenerating || status === "done"}
              placeholder="char_..."
              className="w-full h-9 rounded-lg bg-black/20 border border-white/10 text-white px-3 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || status === "done" || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Submitting...
            </>
          ) : status === "polling" ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Generating...
            </>
          ) : status === "done" ? (
            <>
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Video Ready
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">movie</span>
              Generate Video
            </>
          )}
        </button>

        {quotaInfo && (
          <p className="text-[11px] text-text-muted">
            Free quota used this run: {quotaInfo.used ?? 0} · Remaining on tier: {quotaInfo.remaining ?? 0}
          </p>
        )}
      </div>

      {job && (
        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`material-symbols-outlined text-[18px] ${
                  job.status === "completed" ? "text-emerald-400" : job.status === "failed" ? "text-primary" : "text-slate-400"
                }`}
              >
                {job.status === "completed" ? "check_circle" : job.status === "failed" ? "error" : "hourglass_top"}
              </span>
              <div>
                <p className="text-sm text-white font-medium capitalize">{job.status}</p>
                <p className="text-[10px] text-text-muted font-mono">{job.jobId.slice(0, 16)}... · {job.model}</p>
              </div>
            </div>
            {(job.status === "pending" || job.status === "processing") && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: job.status === "processing" ? "60%" : "20%" }} />
                </div>
              </div>
            )}
          </div>

          {job.videoUrl && (
            <div>
              <video src={job.videoUrl} controls autoPlay loop playsInline className="w-full max-h-[400px] object-contain bg-black" />
              <div className="px-5 py-3 flex items-center gap-2 border-t border-white/5">
                <a
                  href={job.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  Open
                </a>
                <span className="text-white/10">·</span>
                <button
                  onClick={() => navigator.clipboard.writeText(job.videoUrl!)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  Copy URL
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">error</span>
          <div>
            <p className="text-sm text-primary font-medium">{error}</p>
            <button onClick={handleReset} className="mt-1 text-xs text-text-muted hover:text-white transition-colors">
              Try again →
            </button>
          </div>
        </div>
      )}

      {status === "done" && (
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-white/5 bg-surface-dark text-xs font-medium text-slate-400 hover:text-white hover:border-white/10 transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          Generate Another
        </button>
      )}
    </div>
  );
}
