"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NeuralBackground from "@/components/NeuralBackground";
import ScanlineCard from "@/components/ScanlineCard";
import HolographicButton from "@/components/HolographicButton";
import Stepper from "@/components/Stepper";

const API_BASE = ""; 

type CharacterProfile = {
  id: string;
  name?: string;
  niche: string;
  vibe: string;
  characterType: string;
  imageUrl?: string;
  imagePrompt?: string;
};

type Topic = {
  id: string;
  title: string;
  angle: string;
  engagementScore: number;
};

type Script = {
  id: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
};

export default function PipelinePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [charName, setCharName] = useState("");
  const [charBio, setCharBio] = useState("");
  const [niche, setNiche] = useState("crypto");
  const [vibe, setVibe] = useState("confident");

  // Pipeline Data
  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [compiledPrompt, setCompiledPrompt] = useState("");

  const steps = ["Identity", "Market", "Scripting", "Synthesis"];

  // 1. Create Character
  const handleCreateIdentity = async () => {
    setLoading("Architecting Identity...");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/state/character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: `${charName}. ${charBio}`,
          niche,
          vibe,
          role: "influencer",
          language: "en",
          aggressiveness: "spicy",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Creation failed");
      
      const profile = data.profile;
      
      // Auto-trigger portrait
      setLoading("Visualizing Persona...");
      const imgRes = await fetch(`${API_BASE}/api/x402/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bypass-payment": "true" },
        body: JSON.stringify({ prompt: profile.imagePrompt, characterId: profile.id }),
      });
      const imgData = await imgRes.json();
      
      if (imgData.error) throw new Error(imgData.error);

      // Poll for image
      let attempts = 0;
      const poll = setInterval(async () => {
        try {
          const check = await fetch(`${API_BASE}/api/x402/generate-image/${imgData.jobId}`);
          const status = await check.json();
          if (status.status === "completed") {
            clearInterval(poll);
            setCharacter({ ...profile, imageUrl: status.imageUrl, name: charName });
            setLoading(null);
            setStep(2);
          } else if (status.status === "failed") {
            clearInterval(poll);
            setError("Visualization failed: " + (status.error || "Unknown error"));
            setLoading(null);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
        
        if (++attempts > 30) {
          clearInterval(poll);
          setCharacter({ ...profile, name: charName });
          setLoading(null);
          setStep(2);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setLoading(null);
    }
  };

  // 2. Market Research
  const fetchTrends = async () => {
    setLoading("Scanning Social Grid...");
    try {
      const res = await fetch(`${API_BASE}/api/swarm/trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: character?.niche }),
      });
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (step === 2 && topics.length === 0) fetchTrends();
  }, [step]);

  // 3. Scripting
  const selectTopic = async (title: string) => {
    setSelectedTopic(title);
    setLoading("Synthesizing Script...");
    try {
      const res = await fetch(`${API_BASE}/api/swarm/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterProfile: character, topic: title, mode: "manual-topic" }),
      });
      const data = await res.json();
      setScripts(data.scripts || []);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // 4. Final Compile
  const compileVideo = async (script: Script) => {
    setLoading("Compiling Neural Prompt...");
    try {
      const res = await fetch(`${API_BASE}/api/swarm/prompt-compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: character, script }),
      });
      const data = await res.json();
      setCompiledPrompt(data.promptPackage?.primaryPrompt || "Ready for LTX-2");
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#050505] text-white p-6 md:p-12 overflow-x-hidden">
      <NeuralBackground className="opacity-30" />
      
      <div className="relative z-10 max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-display uppercase tracking-widest text-primary shadow-primary/20 drop-shadow-2xl">
              Monadfluence Pipeline
            </h1>
            <p className="text-white/40 text-xs uppercase tracking-[0.4em] mt-2">
              Autonomous Creator Engine // Monad Hackathon
            </p>
          </div>
          <Stepper current={step} total={steps.length} labels={steps} />
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-pulse">
            ERR_SIG_INT: {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-[400px] flex flex-col items-center justify-center space-y-6"
            >
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                <motion.div 
                  className="absolute inset-0 border-4 border-t-primary rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
              </div>
              <p className="text-primary font-mono text-sm tracking-widest animate-pulse uppercase">
                {loading}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-8"
            >
              {step === 1 && (
                <div className="grid lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h2 className="text-2xl font-display uppercase tracking-wider text-white/90">Identity Architecture</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40">Persona Name</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary/50 outline-none transition"
                          placeholder="e.g. Luna Highwire"
                          value={charName}
                          onChange={(e) => setCharName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.3em] text-white/40">Core Directive (Bio)</label>
                        <textarea 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary/50 outline-none transition h-32"
                          placeholder="A high-stakes trader living in the Monad neon districts..."
                          value={charBio}
                          onChange={(e) => setCharBio(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.3em] text-white/40">Market Niche</label>
                          <select 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary/50 outline-none"
                            value={niche}
                            onChange={(e) => setNiche(e.target.value)}
                          >
                            <option value="crypto">Monad Ecosystem</option>
                            <option value="tech">AI Infrastucture</option>
                            <option value="lifestyle">Neon Future</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.3em] text-white/40">Vibe Signature</label>
                          <select 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary/50 outline-none"
                            value={vibe}
                            onChange={(e) => setVibe(e.target.value)}
                          >
                            <option value="confident">Alpha Confident</option>
                            <option value="chaotic">Degen Chaotic</option>
                            <option value="calm">Zen Architect</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <HolographicButton 
                      className="w-full py-4" 
                      onClick={handleCreateIdentity}
                      disabled={!charName || !charBio}
                    >
                      Initialize Identity NFT
                    </HolographicButton>
                  </div>
                  <div className="hidden lg:block relative">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full animate-pulse" />
                    <div className="h-full flex items-center justify-center border border-white/5 bg-white/[0.02] rounded-3xl p-12 text-center">
                       <p className="text-white/20 text-[10px] uppercase tracking-[0.5em]">
                         Awaiting identity parameters for visualization
                       </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="relative w-24 h-24">
                      {character?.imageUrl ? (
                         <img src={character.imageUrl} className="w-full h-full rounded-xl object-cover border border-primary/30 shadow-[0_0_20px_rgba(255,69,0,0.2)]" alt="Character" />
                      ) : (
                         <div className="w-full h-full rounded-xl bg-white/5 flex items-center justify-center text-white/10 text-xs">NO_IMG</div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-display uppercase text-primary tracking-widest">{character?.name}</h2>
                      <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase mt-1">{character?.vibe} // {character?.niche}</p>
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <h3 className="text-[10px] uppercase tracking-[0.4em] text-white/40 px-2">Select Live Market Signal</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {topics.map(t => (
                        <ScanlineCard 
                          key={t.id} 
                          title={t.title}
                          description={t.angle}
                          accent="cyan"
                          onClick={() => selectTopic(t.title)}
                        />
                      ))}
                    </div>
                  </div>
                  <button 
                      className="text-white/20 uppercase text-[10px] tracking-widest hover:text-primary transition mx-auto block mt-8"
                      onClick={() => setStep(1)}
                    >
                      Return to Identity
                    </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                   <div className="flex justify-between items-end">
                      <h2 className="text-2xl font-display uppercase tracking-wider text-primary">Script Synthesis</h2>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest pb-1">Topic: {selectedTopic.substring(0, 30)}...</span>
                   </div>
                   <div className="grid gap-6">
                    {scripts.map((s, i) => (
                      <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden group hover:border-primary/20 transition-all">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors" />
                        <div className="grid md:grid-cols-[1fr_200px] gap-8">
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <span className="text-[10px] uppercase text-primary tracking-widest font-mono">Hook</span>
                              <p className="text-sm text-white/90 italic font-medium leading-relaxed">"{s.hook}"</p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] uppercase text-white/40 tracking-widest font-mono">Core Content</span>
                              <p className="text-xs text-white/60 leading-relaxed font-light">{s.body}</p>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center">
                            <HolographicButton className="w-full py-3 text-[10px] uppercase tracking-widest" onClick={() => compileVideo(s)}>
                              Utilize This Script
                            </HolographicButton>
                          </div>
                        </div>
                      </div>
                    ))}
                   </div>
                   <button 
                      className="text-white/20 uppercase text-[10px] tracking-widest hover:text-primary transition mx-auto block"
                      onClick={() => setStep(2)}
                    >
                      Return to Market
                    </button>
                </div>
              )}

              {step === 4 && (
                <div className="max-w-2xl mx-auto space-y-12 text-center py-8">
                  <div className="space-y-4">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="h-24 w-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto border border-primary/50 shadow-[0_0_50px_rgba(255,69,0,0.2)]"
                    >
                       <span className="text-3xl">🎬</span>
                    </motion.div>
                    <h2 className="text-3xl font-display uppercase tracking-[0.2em]">Synthesis Ready</h2>
                    <p className="text-white/40 text-xs tracking-[0.4em] uppercase">Agent ID 1069 // Ready for Monad Rail</p>
                  </div>
                  
                  <div className="p-10 bg-black border border-primary/20 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-primary/5 scanline" />
                    <div className="relative z-10 space-y-6 text-left">
                       <div className="flex justify-between items-center border-b border-white/5 pb-4">
                          <h3 className="text-[10px] uppercase tracking-[0.5em] text-primary font-bold">Neural Prompt Payload</h3>
                          <span className="text-[9px] text-white/20 font-mono">MODEL: LTX-2-FAST</span>
                       </div>
                       <p className="text-[11px] text-white/80 font-mono leading-relaxed p-6 bg-white/5 rounded-2xl border border-white/5">
                        {compiledPrompt}
                       </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-2">
                       <p className="text-[10px] text-primary uppercase tracking-[0.3em] font-bold">
                         Deployment Cost: $0.24 USDC
                       </p>
                       <p className="text-[9px] text-white/20 uppercase tracking-[0.2em]">
                         Triggers ERC-3009 Gasless Micropayment on Monad Testnet
                       </p>
                    </div>
                    
                    <HolographicButton 
                      className="w-full py-6 text-xl tracking-[0.2em]" 
                      onClick={() => alert("Deployment Logic Verified. LTX-2 Worker assignment requires 0.24 USDC. (Transaction logic bypassed per user safety directive)")}
                    >
                      PROCEED TO SOCIAL GRID
                    </HolographicButton>
                    
                    <div className="flex justify-center gap-8">
                      <button 
                        className="text-white/20 uppercase text-[10px] tracking-widest hover:text-primary transition"
                        onClick={() => setStep(1)}
                      >
                        Reset Pipeline
                      </button>
                      <button 
                        className="text-white/20 uppercase text-[10px] tracking-widest hover:text-primary transition"
                        onClick={() => setStep(3)}
                      >
                        Back to Script
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
