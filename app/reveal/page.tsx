"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import HolographicButton from "@/components/HolographicButton";
import ParticleOrbit from "@/components/ParticleOrbit";

const phases = [0, 800, 1500, 2500, 3200];

export default function RevealPage() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = phases.map((delay, index) =>
      window.setTimeout(() => setPhase(index), delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <main className="min-h-screen px-6 pb-24 pt-12 md:px-16">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.38em] text-[rgba(255,255,255,0.55)]">
          Character Reveal Protocol
        </p>
        <h1 className="font-display mt-4 text-3xl uppercase tracking-[0.28em] text-white">
          Neural Link Established
        </h1>
      </header>

      <section className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-3xl border border-[rgba(255,69,0,0.3)] bg-[rgba(8,8,14,0.85)] p-10 shadow-[0_0_60px_rgba(255,69,0,0.3)]">
          <ParticleOrbit className="-inset-10" />

          <motion.div
            className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(255,69,0,0.4)]"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: phase >= 1 ? 1 : 0,
              opacity: phase >= 1 ? 1 : 0,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,69,0,0.12),transparent,rgba(0,240,255,0.1))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,69,0,0.2),transparent_60%)]" />
          </motion.div>

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
            animate={{
              opacity: phase >= 3 ? 1 : 0,
              scale: phase >= 3 ? 1 : 0.9,
              filter: phase >= 3 ? "blur(0px)" : "blur(20px)",
            }}
            transition={{ duration: 0.9, ease: [0.43, 0.13, 0.23, 0.96] }}
          >
            <div className="holo-frame">
              <div className="holo-frame-media">Character hologram</div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 20 }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-[rgba(255,69,0,0.3)] bg-[rgba(10,10,18,0.8)] p-6"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.6)]">
              Identity Broadcast
            </p>
            <h2 className="font-display mt-4 text-2xl uppercase tracking-[0.24em] text-white">
              @CRYPTOSAVAGEAI
            </h2>
            <p className="mt-2 text-sm text-[rgba(255,245,240,0.65)]">
              Your savage crypto commentator with calibrated edge and viral posture.
            </p>
          </motion.div>

          <div className="rounded-2xl border border-[rgba(255,69,0,0.3)] bg-[rgba(10,10,18,0.8)] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.6)]">
              Action Interface
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <HolographicButton variant="primary" size="md">
                Neural Lock Confirmed - Proceed
              </HolographicButton>
              <HolographicButton variant="secondary" size="md">
                Regenerate Matrix
              </HolographicButton>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[rgba(255,255,255,0.4)]">
              1 of 2 regenerations remaining
            </p>
          </div>

          <Link href="/create" className="inline-block text-xs uppercase tracking-[0.3em] text-[rgba(0,240,255,0.7)]">
            Return to creation flow
          </Link>
        </div>
      </section>
    </main>
  );
}
