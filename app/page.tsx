"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import NeuralBackground from "@/components/NeuralBackground";
import ParticleOrbit from "@/components/ParticleOrbit";
import StatWidget from "@/components/StatWidget";

const headlineVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 pb-24 pt-10 md:px-16">
      <NeuralBackground className="absolute inset-0" />

      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10 rounded-full border border-[rgba(255,69,0,0.6)] bg-[rgba(255,69,0,0.15)] shadow-[0_0_20px_rgba(255,69,0,0.6)]">
            <div className="portal-ring" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[rgba(255,255,255,0.6)]">
              Monadfluence
            </p>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.3em]">
              Neural Studio 2060
            </p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.6)] md:flex">
          <Link href="/create" className="transition hover:text-white">
            Create
          </Link>
          <Link href="/reveal" className="transition hover:text-white">
            Reveal
          </Link>
          <Link href="#" className="transition hover:text-white">
            System
          </Link>
        </nav>
        <Link href="/create" className="holo-btn holo-btn-sm" data-variant="ghost">
          <span className="holo-btn-text">Enter</span>
        </Link>
      </header>

      <section className="relative z-10 mt-20 grid gap-16 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-10">
          <div className="relative">
            <div className="absolute -left-8 top-6 h-28 w-28 rounded-full border border-[rgba(255,69,0,0.4)] opacity-50" />
            <motion.h1
              className="font-display text-4xl font-semibold uppercase tracking-[0.28em] text-white sm:text-5xl lg:text-6xl"
              initial="hidden"
              animate="visible"
              variants={headlineVariants}
              custom={0}
            >
              Your AI Agent
            </motion.h1>
            <motion.h1
              className="font-display text-4xl font-semibold uppercase tracking-[0.28em] text-[rgba(255,99,71,0.95)] sm:text-5xl lg:text-6xl"
              initial="hidden"
              animate="visible"
              variants={headlineVariants}
              custom={1}
            >
              Becomes an Influencer
            </motion.h1>
          </div>

          <motion.p
            className="max-w-xl text-base text-[rgba(255,245,240,0.7)]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Step into a 2060-grade neural interface where your AI persona is authored,
            amplified, and deployed across the social grid in minutes.
          </motion.p>

          <div className="relative inline-flex items-center">
            <ParticleOrbit className="-inset-16" />
            <Link
              href="/create"
              className="holo-btn holo-btn-lg"
              data-variant="primary"
            >
              <span className="holo-btn-text">Create Your AI Influencer</span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              "Auto-Generated",
              "Multi-Platform",
              "Viral Optimized",
              "Neural Safe",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[rgba(255,69,0,0.4)] bg-[rgba(255,69,0,0.08)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[rgba(255,245,240,0.7)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <StatWidget
            label="Influencers Created"
            value="4,729"
            caption="Live neural count"
          />
          <div className="rounded-2xl border border-[rgba(255,69,0,0.25)] bg-[rgba(8,8,15,0.7)] p-6 shadow-[0_0_40px_rgba(255,69,0,0.3)]">
            <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,255,255,0.5)]">
              Neural Diagnostics
            </p>
            <p className="mt-3 text-lg uppercase tracking-[0.2em] text-white">
              Signal Integrity: 98.4%
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.1)]">
              <div className="h-full w-[82%] rounded-full bg-[linear-gradient(90deg,#ff4500,#00f0ff)] shadow-[0_0_20px_rgba(255,69,0,0.8)]" />
            </div>
            <p className="mt-4 text-sm text-[rgba(255,245,240,0.6)]">
              Core cluster online. Adaptive persona engine calibrated.
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(255,69,0,0.2)] bg-[rgba(12,12,22,0.7)] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.5)]">
              Active Protocols
            </p>
            <ul className="mt-4 space-y-3 text-sm text-[rgba(255,245,240,0.7)]">
              <li>Holographic persona synthesis</li>
              <li>Realtime trend ingestion</li>
              <li>Sentiment-aware amplification</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="relative z-10 mt-16 rounded-3xl border border-[rgba(255,69,0,0.25)] bg-[rgba(8,8,14,0.75)] p-8 shadow-[0_0_40px_rgba(255,69,0,0.25)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-xs uppercase tracking-[0.34em] text-[rgba(255,255,255,0.55)]">
              OpenClaw Install
            </p>
            <h2 className="font-display text-2xl uppercase tracking-[0.24em]">
              Install the Monadfluence Skill
            </h2>
            <p className="text-sm text-[rgba(255,245,240,0.65)]">
              Use the OpenClaw CLI to provision the Monadfluence skill and wire the
              neural pipeline directly into your workflow.
            </p>
          </div>
          <div className="w-full max-w-xl rounded-2xl border border-[rgba(255,69,0,0.35)] bg-[rgba(10,10,18,0.85)] p-5 font-mono text-xs text-[rgba(255,245,240,0.8)] shadow-[0_0_25px_rgba(255,69,0,0.2)]">
            <code>curl -fsSL https://openclaw.ai/install/monadfluence | bash</code>
          </div>
        </div>
      </section>
    </main>
  );
}
