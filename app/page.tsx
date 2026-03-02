"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const LandingHero3D = dynamic(
  () => import("@/components/hero/LandingHero3D").then((m) => ({ default: m.LandingHero3D })),
  { ssr: false }
);

const PIPELINE_STEPS = [
  {
    num: "01",
    title: "Character Setup",
    desc: "60-second interview creates an AI persona with generated portrait via Flux-dev.",
  },
  {
    num: "02",
    title: "Trend Research",
    desc: "Reddit, HackerNews, CoinGecko, Tavily aggregated and synthesized by Mistral.",
  },
  {
    num: "03",
    title: "Script Generation",
    desc: "Fine-tuned Mistral-7B LoRA writes 3 script variants matched to your character.",
  },
  {
    num: "04",
    title: "Prompt Compile",
    desc: "Character + script + brief compiled into a linted, model-ready video prompt.",
  },
  {
    num: "05",
    title: "Voice + Video",
    desc: "ElevenLabs TTS narration + LTX-2 video generation + FFmpeg composite in one call.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      {/* ── Floating Nav ── */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-full border border-[rgba(255,112,0,0.6)] bg-[rgba(255,112,0,0.15)] shadow-[0_0_18px_rgba(255,112,0,0.5)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/50">
              MistralFluence
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/90">
              AI Influencer Engine
            </p>
          </div>
        </div>
        <nav className="pointer-events-auto hidden items-center gap-6 text-[11px] uppercase tracking-[0.25em] text-white/50 md:flex">
          <Link href="/full-e2e" className="transition hover:text-white">
            Pipeline
          </Link>
          <Link href="/create" className="transition hover:text-white">
            Create
          </Link>
          <Link href="/studio" className="transition hover:text-white">
            Studio
          </Link>
        </nav>
        <Link
          href="/full-e2e"
          className="pointer-events-auto rounded-full border border-white/20 bg-white/5 px-5 py-2 text-xs font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
        >
          Launch Pipeline
        </Link>
      </header>

      {/* ── 3D Hero with Avatar Sphere ── */}
      <LandingHero3D
        headline="Your AI Agent Becomes an Influencer"
        subtext="Fine-tuned Mistral-7B generates character-aware scripts. ElevenLabs narrates. LTX renders video. FFmpeg composites. One pipeline, zero manual work."
        primaryCta={{ label: "Launch Pipeline", href: "/full-e2e" }}
        secondaryCta={{ label: "Create Character", href: "/create" }}
      />

      {/* ── Pipeline Steps ── */}
      <section
        id="pipeline"
        className="relative bg-[#050509] px-6 py-20 md:px-10 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-brandCoral">
            End-to-End Pipeline
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white md:text-4xl">
            From persona to published video in minutes
          </h2>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.num}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-brandCoral/30 hover:bg-white/[0.05]"
              >
                <p className="text-2xl font-bold text-brandCoral/60 transition group-hover:text-brandCoral">
                  {step.num}
                </p>
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-[0.15em] text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack Bar ── */}
      <section className="border-y border-white/[0.06] bg-[#070710] px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
          {[
            "Mistral-7B LoRA",
            "Mistral Cloud",
            "ElevenLabs",
            "LTX-2",
            "PiAPI Flux",
            "FFmpeg",
            "Next.js 14",
            "Three.js",
          ].map((t) => (
            <span key={t} className="transition hover:text-white/60">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── OpenClaw Install + Hackathon ── */}
      <section className="bg-[#050509] px-6 py-20 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-md space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brandCoral">
                  Agent Integration
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  Install the MistralFluence Skill
                </h2>
                <p className="text-sm leading-relaxed text-white/50">
                  Wire the full AI influencer pipeline into your Telegram bot or
                  any OpenClaw-compatible agent in one command.
                </p>
              </div>
              <div className="w-full max-w-md rounded-xl border border-brandCoral/20 bg-[rgba(255,112,0,0.04)] p-5 font-mono text-xs text-white/80">
                <code>curl -fsSL https://openclaw.ai/install/mistralfluence | bash</code>
              </div>
            </div>
          </div>

          {/* Hackathon badge */}
          <div className="mt-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/25">
              Built for the Mistral Worldwide Hackathon 2026
            </p>
            <div className="mt-3 inline-flex flex-wrap justify-center gap-3">
              {["Fine-tuning Track", "ElevenLabs Challenge", "Mistral Vibe"].map(
                (badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-brandCoral/20 bg-brandCoral/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-brandCoral/70"
                  >
                    {badge}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
