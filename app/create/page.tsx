"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Stepper from "@/components/Stepper";
import ScanlineCard from "@/components/ScanlineCard";
import HolographicButton from "@/components/HolographicButton";

const stepLabels = ["Niche", "Vibe", "Style", "Tuning", "Initialize"];

const niches = [
  { id: "crypto", title: "Crypto", description: "Digital gold & DeFi wisdom", accent: "red" },
  { id: "memes", title: "Memes", description: "Internet culture accelerator", accent: "magenta" },
  { id: "politics", title: "Politics", description: "Hot takes & commentary", accent: "gold" },
  { id: "dance", title: "Dance", description: "Moves, music, expression", accent: "cyan" },
];

const vibes = [
  { id: "savage", title: "Savage", description: "Bold, edgy, unfiltered", accent: "red" },
  { id: "funny", title: "Funny", description: "Witty, entertaining", accent: "gold" },
  { id: "calm", title: "Calm", description: "Thoughtful, composed", accent: "cyan" },
  { id: "premium", title: "Premium", description: "Sophisticated, exclusive", accent: "magenta" },
];

const styles = [
  { id: "human", title: "Human-like", description: "Realistic, relatable, authentic", accent: "red" },
  { id: "anime", title: "Anime", description: "Expressive, stylized, iconic", accent: "magenta" },
  { id: "stylized", title: "3D Stylized", description: "Futuristic, cinematic, bold", accent: "cyan" },
];

const platforms = ["Instagram", "TikTok", "YouTube", "X / Threads"];

export default function CreatePage() {
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState(niches[0].id);
  const [vibe, setVibe] = useState(vibes[0].id);
  const [style, setStyle] = useState(styles[0].id);
  const [edge, setEdge] = useState(62);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([platforms[0]]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step !== 5) return;
    setProgress(0);
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + (prev > 60 ? 3 : 2);
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [step]);

  const logs = useMemo(
    () => [
      { label: "Compiling personality matrix", done: progress > 25 },
      { label: "Generating visual identity", done: progress > 40 },
      { label: "Calibrating voice profile", done: progress > 55 },
      { label: "Rendering character hologram", done: progress > 70 },
      { label: "Finalizing neural pathways", done: progress > 88 },
    ],
    [progress]
  );

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((item) => item !== platform)
        : [...prev, platform]
    );
  };

  return (
    <main className="min-h-screen px-6 pb-28 pt-10 md:px-16">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.38em] text-[rgba(255,255,255,0.55)]">
          Character Creation Flow
        </p>
        <h1 className="font-display mt-4 text-3xl font-semibold uppercase tracking-[0.28em] text-white">
          Build the Neural Persona
        </h1>
      </header>

      <Stepper current={step} total={5} labels={stepLabels} />

      <section className="mt-12 rounded-3xl border border-[rgba(255,69,0,0.25)] bg-[rgba(8,8,14,0.7)] p-8 shadow-[0_0_45px_rgba(255,69,0,0.2)]">
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.55)]">
                Step 1
              </p>
              <h2 className="font-display mt-3 text-2xl uppercase tracking-[0.24em]">
                What&apos;s your influencer&apos;s world?
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {niches.map((item) => (
                <ScanlineCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  accent={item.accent as "red" | "cyan" | "gold" | "magenta"}
                  selected={niche === item.id}
                  onClick={() => setNiche(item.id)}
                  icon={<span>{item.title.slice(0, 2).toUpperCase()}</span>}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.55)]">
                Step 2
              </p>
              <h2 className="font-display mt-3 text-2xl uppercase tracking-[0.24em]">
                What&apos;s their personality core?
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {vibes.map((item) => (
                <ScanlineCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  accent={item.accent as "red" | "cyan" | "gold" | "magenta"}
                  selected={vibe === item.id}
                  onClick={() => setVibe(item.id)}
                  icon={<span>{item.title.slice(0, 2).toUpperCase()}</span>}
                />
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.55)]">
                Step 3
              </p>
              <h2 className="font-display mt-3 text-2xl uppercase tracking-[0.24em]">
                How should they appear?
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {styles.map((item) => (
                <ScanlineCard
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  accent={item.accent as "red" | "cyan" | "gold" | "magenta"}
                  selected={style === item.id}
                  onClick={() => setStyle(item.id)}
                  icon={<span>3D</span>}
                />
              ))}
            </div>
            <div className="holo-frame">
              <div className="holo-preview">
                <img
                  src="/images/hologram-preview.svg"
                  alt="Holographic character preview"
                />
                <div className="holo-preview-label">Hologram preview</div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.55)]">
                Step 4
              </p>
              <h2 className="font-display mt-3 text-2xl uppercase tracking-[0.24em]">
                Fine-tune the neural matrix
              </h2>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[rgba(255,69,0,0.25)] bg-[rgba(12,12,20,0.6)] p-6">
                <p className="text-xs uppercase tracking-[0.32em] text-[rgba(255,255,255,0.6)]">
                  Content Edge Level
                </p>
                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={edge}
                    onChange={(event) => setEdge(Number(event.target.value))}
                    className="edge-slider"
                  />
                  <p className="mt-2 text-sm text-[rgba(255,245,240,0.65)]">
                    Current intensity: {edge}%
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(255,69,0,0.25)] bg-[rgba(12,12,20,0.6)] p-6">
                <p className="text-xs uppercase tracking-[0.32em] text-[rgba(255,255,255,0.6)]">
                  Target Platforms
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {platforms.map((platform) => {
                    const selected = selectedPlatforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.28em] transition ${
                          selected
                            ? "border-[rgba(255,69,0,0.9)] bg-[rgba(255,69,0,0.2)] shadow-[0_0_20px_rgba(255,69,0,0.5)]"
                            : "border-[rgba(255,69,0,0.3)] bg-[rgba(255,69,0,0.05)]"
                        }`}
                      >
                        {platform}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(255,69,0,0.25)] bg-[rgba(12,12,20,0.6)] p-6">
                <p className="text-xs uppercase tracking-[0.32em] text-[rgba(255,255,255,0.6)]">
                  Content Role
                </p>
                <select className="mt-4 w-full rounded-xl border border-[rgba(255,69,0,0.4)] bg-[rgba(8,8,14,0.9)] px-4 py-3 text-sm uppercase tracking-[0.2em]">
                  <option>Explainer</option>
                  <option>Commentator</option>
                  <option>Meme Lord</option>
                  <option>Storyteller</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.55)]">
                Step 5
              </p>
              <h2 className="font-display mt-3 text-2xl uppercase tracking-[0.24em]">
                Initializing Neural Matrix
              </h2>
            </div>

            <div className="rounded-2xl border border-[rgba(255,69,0,0.25)] bg-[rgba(8,8,14,0.8)] p-6">
              <p className="text-sm uppercase tracking-[0.28em] text-[rgba(255,255,255,0.7)]">
                Neural Sphere Activation
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#ff4500,#00f0ff)] shadow-[0_0_20px_rgba(255,69,0,0.8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-[rgba(255,245,240,0.6)]">{progress}% complete</p>
            </div>

            <div className="rounded-2xl border border-[rgba(255,69,0,0.25)] bg-[rgba(8,8,14,0.8)] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.5)]">
                Status Console
              </p>
              <div className="mt-4 space-y-3 text-sm text-[rgba(255,245,240,0.7)]">
                {logs.map((log) => (
                  <div key={log.label} className="flex items-center justify-between">
                    <span>{log.label}</span>
                    <span>{log.done ? "OK" : "..."}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="sticky bottom-6 z-20 mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[rgba(255,69,0,0.35)] bg-[rgba(8,8,14,0.9)] p-4 shadow-[0_0_30px_rgba(255,69,0,0.25)] backdrop-blur">
          <HolographicButton
            variant="secondary"
            size="sm"
            disabled={step === 1}
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          >
            Back
          </HolographicButton>

          {step < 5 ? (
            <HolographicButton
              variant="primary"
              size="sm"
              onClick={() => setStep((prev) => Math.min(5, prev + 1))}
            >
              Next
            </HolographicButton>
          ) : (
            <Link
              href="/reveal"
              className="holo-btn holo-btn-sm"
              data-variant="primary"
            >
              <span className="holo-btn-text">Proceed to Reveal</span>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
