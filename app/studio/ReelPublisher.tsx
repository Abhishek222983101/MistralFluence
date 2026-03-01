"use client";

import { useState } from "react";

type Props = {
  videoUrl: string | null;
};

type PublishResult = {
  success: boolean;
  mediaId?: string;
  reelUrl?: string;
  error?: string;
};

export default function ReelPublisher({ videoUrl }: Props) {
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("monadfluence,aiugc");
  const [characterId, setCharacterId] = useState("");
  const [status, setStatus] = useState<"idle" | "publishing" | "done" | "error">("idle");
  const [result, setResult] = useState<PublishResult | null>(null);

  async function handlePublish() {
    if (!videoUrl) return;

    setStatus("publishing");
    setResult(null);

    try {
      const res = await fetch("/api/x402/publish-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          caption,
          hashtags: hashtags
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          characterId: characterId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.status === 402) {
        throw new Error("Payment required for publish. Complete x402 payment and retry.");
      }
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to publish reel");
      }

      setStatus("done");
      setResult({
        success: true,
        mediaId: data.mediaId,
        reelUrl: data.reelUrl,
      });
    } catch (err) {
      setStatus("error");
      setResult({ success: false, error: (err as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <h2 className="text-lg font-semibold text-white">Publish to Instagram</h2>
      </div>

      {!videoUrl && (
        <div className="rounded-xl border border-dashed border-white/10 bg-surface-dark p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-text-muted mb-2">movie</span>
          <p className="text-text-muted text-sm">Generate a video above first</p>
          <p className="text-text-muted text-xs mt-1">Your video will appear here once ready</p>
        </div>
      )}

      {videoUrl && (
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5 space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
            <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
            <span className="text-xs text-text-muted">Video ready</span>
            <span className="text-xs text-white font-mono truncate flex-1">{videoUrl.slice(0, 50)}...</span>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Caption</p>
            <textarea
              placeholder="Write a caption for your Reel..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={status === "publishing" || status === "done"}
              rows={2}
              className="w-full rounded-lg bg-black/20 border border-white/10 text-white text-sm px-4 py-3 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all disabled:opacity-50 resize-none"
            />
            <p className="text-[10px] text-text-muted text-right mt-1">{caption.length}/2200</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Hashtags</p>
              <input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                disabled={status === "publishing" || status === "done"}
                placeholder="monadfluence,aiugc,ugcads"
                className="w-full h-10 rounded-lg bg-black/20 border border-white/10 text-white text-sm px-3 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Character ID (optional)</p>
              <input
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                disabled={status === "publishing" || status === "done"}
                placeholder="char_..."
                className="w-full h-10 rounded-lg bg-black/20 border border-white/10 text-white text-sm px-3 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          <button
            onClick={handlePublish}
            disabled={status === "publishing" || status === "done"}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "publishing" ? (
              <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Publishing...</>
            ) : status === "done" ? (
              <><span className="material-symbols-outlined text-[16px]">check_circle</span>Published</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">publish</span>Publish Reel</>
            )}
          </button>
        </div>
      )}

      {result?.success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
            <p className="text-sm text-emerald-400 font-medium">Reel published successfully</p>
          </div>
          <div className="flex items-center gap-3">
            {result.reelUrl && result.reelUrl !== "#" && (
              <a
                href={result.reelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                View on Instagram
              </a>
            )}
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">error</span>
          <p className="text-sm text-primary font-medium">{result.error}</p>
        </div>
      )}
    </div>
  );
}
