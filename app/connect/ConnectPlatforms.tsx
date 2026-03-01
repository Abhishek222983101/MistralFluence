"use client";

import { useEffect, useState } from "react";

export default function ConnectPlatforms() {
  const [igStatus, setIgStatus] = useState<"idle" | "connecting" | "connected">("idle");

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const res = await fetch("/api/auth/instagram/status", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (res.ok && data?.connected) {
          setIgStatus("connected");
        }
      } catch {
        // keep idle when status probe fails
      }
    }

    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Instagram Connection */}
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 ring-1 ring-pink-500/20">
            <span className="material-symbols-outlined text-pink-400 text-[22px]">photo_camera</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Instagram</h2>
            <p className="text-xs text-text-muted">Connect your Instagram Business account to autopost Reels</p>
          </div>
        </div>

        {igStatus === "connected" ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-emerald-500/20">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm text-white">Instagram Connected</span>
            <span className="ml-auto text-xs text-emerald-400 font-medium">Active</span>
          </div>
        ) : (
          <a
            href="/api/auth/instagram"
            onClick={() => setIgStatus("connecting")}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-bold hover:from-purple-500 hover:to-pink-400 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">add_link</span>
            Connect Instagram
          </a>
        )}
      </div>

      {/* MONAD Chain Wallet (coming soon) */}
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 opacity-60">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
            <span className="material-symbols-outlined text-purple-400 text-[22px]">account_balance_wallet</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">MONAD Chain Wallet</h2>
            <p className="text-xs text-text-muted">Connect your EVM wallet for on-chain payments</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-black/20 border border-white/10">
          <span className="material-symbols-outlined text-text-muted text-[16px]">schedule</span>
          <span className="text-xs text-text-muted">Coming soon — x402 payments handle this automatically</span>
        </div>
      </div>
    </div>
  );
}
