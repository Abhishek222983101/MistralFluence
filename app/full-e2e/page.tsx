"use client";

import { useState } from "react";

const API_BASE = "";

type CharacterProfile = {
  id: string;
  niche: string;
  characterType: string;
  vibe: string;
  role: string;
  language: string;
  aggressiveness: string;
  imageUrl?: string;
  imagePrompt?: string;
  styleGuide?: string;
};

type Topic = {
  id: string;
  title: string;
  angle: string;
  hookIdea: string;
  engagementScore: number;
};

type Script = {
  id: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  durationTargetSec: number;
};

const NICHES = [
  { id: "crypto", label: "Crypto", icon: "💎" },
  { id: "tech", label: "Tech", icon: "🤖" },
  { id: "memes", label: "Memes", icon: "😂" },
];

const VIBES = [
  { id: "chaotic", label: "Chaotic" },
  { id: "confident", label: "Confident" },
  { id: "calm", label: "Calm" },
];

export default function FullE2EPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Character form
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("crypto");
  const [vibe, setVibe] = useState("chaotic");
  const [aggressiveness, setAggressiveness] = useState("safe");

  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsMode, setTopicsMode] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [scripts, setScripts] = useState<Script[]>([]);
  const [briefId, setBriefId] = useState("");
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [videoJobId, setVideoJobId] = useState("");
  const [videoStatus, setVideoStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageJobId, setImageJobId] = useState("");
  const [imageStatus, setImageStatus] = useState("");

  // Step 1: Create Character + Generate Image
  const createCharacter = async () => {
    setLoading("Creating character...");
    setError(null);
    try {
      // 1. Save character to API (gets imagePrompt auto-generated)
      const res = await fetch(`${API_BASE}/api/state/character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: `${name}. ${bio}`,
          niche,
          vibe,
          role: "commentator",
          language: "en",
          aggressiveness,
          styleGuide: "Cinematic, high contrast, 8k",
          exclusions: [],
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create character");
      
      const profile = data.profile as CharacterProfile;
      setCharacter(profile);
      
      // 2. Trigger image generation with bypass
      setLoading("Generating character image...");
      
      const fallbackPrompt = `A hyper-realistic cinematic portrait of a ${niche} influencer with a ${vibe} aesthetic, vertical 9:16 aspect ratio, high fashion.`;
      
      const imgRes = await fetch(`${API_BASE}/api/x402/generate-image`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-bypass-payment": "true",
          "x-api-key": "mistral2026"
        },
        body: JSON.stringify({
          prompt: profile.imagePrompt || fallbackPrompt,
          characterId: profile.id,
          model: "flux-schnell",
        }),
      });
      
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.error || "Failed to start image generation");
      
      setImageJobId(imgData.jobId);
      setImageStatus("pending");
      
      // 3. Poll for image completion
      pollImage(imgData.jobId, profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(null);
    }
  };

  const pollImage = async (jobId: string, profile: CharacterProfile) => {
    try {
      const res = await fetch(`${API_BASE}/api/x402/generate-image/${jobId}`);
      const data = await res.json();
      setImageStatus(data.status);
      
      if (data.status === "completed" && data.imageUrl) {
        setCharacter({ ...profile, imageUrl: data.imageUrl });
        setLoading(null);
        setStep(2);
      } else if (data.status === "failed") {
        setError("Image generation failed: " + (data.error || "Unknown error"));
        setLoading(null);
      } else {
        setTimeout(() => pollImage(jobId, profile), 3000);
      }
    } catch {
      setTimeout(() => pollImage(jobId, profile), 3000);
    }
  };

  // Fetch Trends
  const fetchTopics = async () => {
    if (!character) return;
    setLoading("Fetching trends from Reddit, HN, CoinGecko...");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/swarm/trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: character.niche }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTopics(data.topics);
      setTopicsMode(data.mode);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  // Generate Scripts
  const generateScripts = async (topic: string) => {
    if (!character) return;
    setLoading("Generating scripts with Mistral AI...");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/swarm/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterProfile: character,
          topic,
          mode: "manual-topic",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScripts(data.scripts);
      setBriefId(data.brief?.id || "");
      setSelectedTopic(topic);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  // Compile Prompt
  const compilePrompt = async (script: Script) => {
    if (!character) return;
    setLoading("Compiling video prompt...");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/swarm/prompt-compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { ...character, exclusions: [] },
          brief: {
            id: briefId,
            userKey: "e2e-test",
            characterId: character.id,
            mode: "manual-topic",
            niche: character.niche,
            topic: selectedTopic,
            createdAt: new Date().toISOString(),
          },
          script,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCompiledPrompt(data.promptPackage?.primaryPrompt || JSON.stringify(data));
      setSelectedScript(script);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  // Generate Video
  const submitVideo = async () => {
    if (!character) return;
    setLoading("Submitting video generation...");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/x402/generate-video`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-bypass-payment": "true",
          "x-api-key": "mistral2026"
        },
        body: JSON.stringify({
          prompt: compiledPrompt,
          model: "hailuo",
          tier: "basic",
          duration: 10,
          aspectRatio: "9:16",
          characterId: character.id,
          scriptText: selectedScript
            ? `${selectedScript.hook}\n${selectedScript.body}\n${selectedScript.cta}`
            : undefined,
        }),
      });
      const data = await res.json();
      
      if (res.status === 402) {
        throw new Error("Payment required");
      }
      
      if (data.error) throw new Error(data.error);
      setVideoJobId(data.jobId);
      setVideoStatus("pending");
      setStep(6);
      pollVideo(data.jobId, data.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const pollVideo = async (jobId: string, model: string) => {
    setLoading("Generating video (1-3 min)...");
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/x402/generate-video/${jobId}?model=${model}`);
        const data = await res.json();
        setVideoStatus(data.status);
        if (data.status === "completed") {
          setVideoUrl(data.videoUrl);
          setLoading(null);
        } else if (data.status === "failed") {
          setError(data.error || "Video failed");
          setLoading(null);
        } else {
          setTimeout(poll, 6000);
        }
      } catch {
        setTimeout(poll, 6000);
      }
    };
    poll();
  };

  const reset = () => {
    setStep(1);
    setCharacter(null);
    setTopics([]);
    setScripts([]);
    setSelectedTopic("");
    setCompiledPrompt("");
    setVideoJobId("");
    setVideoUrl("");
    setImageJobId("");
    setImageStatus("");
    setError(null);
    setLoading(null);
  };

  const styles = {
    container: {
      fontFamily: "system-ui, sans-serif",
      maxWidth: "800px",
      margin: "0 auto",
      padding: "20px",
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#fff",
    },
    card: {
      padding: "24px",
      background: "#161616",
      borderRadius: "12px",
      marginBottom: "20px",
    },
    input: {
      width: "100%",
      padding: "12px",
      background: "#1a1a1a",
      border: "1px solid #333",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "16px",
      marginBottom: "12px",
    },
    textarea: {
      width: "100%",
      padding: "12px",
      background: "#1a1a1a",
      border: "1px solid #333",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "16px",
      minHeight: "80px",
      resize: "vertical" as const,
      marginBottom: "12px",
    },
    button: (color = "#e04d52") => ({
      padding: "12px 24px",
      background: color,
      border: "none",
      borderRadius: "8px",
      color: "#fff",
      fontWeight: 600,
      cursor: "pointer",
    }),
    optionBtn: (selected: boolean) => ({
      padding: "12px 20px",
      background: selected ? "#e04d52" : "#1a1a1a",
      border: selected ? "2px solid #e04d52" : "1px solid #333",
      borderRadius: "8px",
      color: "#fff",
      cursor: "pointer",
      marginRight: "10px",
      marginBottom: "10px",
    }),
  };

  return (
    <div style={styles.container}>
      <h1 style={{ textAlign: "center", color: "#e04d52", marginBottom: "10px" }}>
        MistralFluence Pipeline
      </h1>
      <p style={{ textAlign: "center", color: "#4ade80", marginBottom: "20px" }}>
        Demo Mode - Free
      </p>

      {/* Progress */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
        {["Character", "Trends", "Scripts", "Prompt", "Video"].map((s, i) => (
          <div key={s} style={{
            padding: "6px 12px",
            borderRadius: "16px",
            background: step > i ? "#4ade80" : step === i + 1 ? "#e04d52" : "#1a1a1a",
            fontSize: "12px",
          }}>
            {s}
          </div>
        ))}
      </div>

      {error && <div style={{ padding: "12px", background: "#2a1515", borderRadius: "8px", color: "#ff6b6b", marginBottom: "15px" }}>{error}</div>}
      {loading && <div style={{ padding: "12px", background: "#1a1a1a", borderRadius: "8px", textAlign: "center", color: "#888", marginBottom: "15px" }}>{loading}</div>}

      {/* Step 1: Character */}
      {step === 1 && (
        <div style={styles.card}>
          <h2 style={{ marginBottom: "15px" }}>Create Character</h2>
          
          <label style={{ fontSize: "12px", color: "#888" }}>Name</label>
          <input style={styles.input} placeholder="Alex Node" value={name} onChange={e => setName(e.target.value)} />
          
          <label style={{ fontSize: "12px", color: "#888" }}>Bio</label>
          <textarea style={styles.textarea} placeholder="A crypto degen who lost everything in 2022..." value={bio} onChange={e => setBio(e.target.value)} />
          
          <label style={{ fontSize: "12px", color: "#888" }}>Niche</label>
          <div style={{ marginBottom: "12px" }}>
            {NICHES.map(n => (
              <button key={n.id} style={styles.optionBtn(niche === n.id)} onClick={() => setNiche(n.id)}>
                {n.icon} {n.label}
              </button>
            ))}
          </div>
          
          <label style={{ fontSize: "12px", color: "#888" }}>Vibe</label>
          <div style={{ marginBottom: "12px" }}>
            {VIBES.map(v => (
              <button key={v.id} style={styles.optionBtn(vibe === v.id)} onClick={() => setVibe(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          
          <label style={{ fontSize: "12px", color: "#888" }}>Spicy Mode</label>
          <div>
            <button 
              style={styles.optionBtn(aggressiveness === "spicy")} 
              onClick={() => setAggressiveness(aggressiveness === "safe" ? "spicy" : "safe")}
            >
              {aggressiveness === "spicy" ? "🌶️ Spicy ON" : "Safe Mode"}
            </button>
          </div>
          
          <button 
            onClick={createCharacter} 
            disabled={!name || !bio || loading !== null}
            style={{ ...styles.button(), marginTop: "20px", opacity: (!name || !bio) ? 0.5 : 1 }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Trends */}
      {step === 2 && (
        <div style={styles.card}>
          <h2 style={{ marginBottom: "15px" }}>Character Ready!</h2>
          
          {character?.imageUrl && (
            <div style={{ marginBottom: "15px", textAlign: "center" }}>
              <img 
                src={character.imageUrl} 
                style={{ width: "150px", height: "150px", borderRadius: "12px", objectFit: "cover" }}
                alt="Character"
              />
            </div>
          )}
          
          <div style={{ marginBottom: "15px", padding: "12px", background: "#1a1a1a", borderRadius: "8px" }}>
            <p style={{ margin: "0 0 5px 0", fontWeight: 600 }}>{character?.characterType?.split(".")[0]}</p>
            <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
              {character?.vibe} • {character?.niche} • {character?.aggressiveness}
            </p>
          </div>
          
          <button onClick={fetchTopics} disabled={loading !== null} style={styles.button("#3b82f6")}>
            Fetch Trending Topics
          </button>
        </div>
      )}

      {/* Step 3: Topics */}
      {step === 3 && topics.length > 0 && (
        <div style={styles.card}>
          <h2 style={{ marginBottom: "10px" }}>{topics.length} Topics ({topicsMode})</h2>
          {topics.map((t, i) => (
            <div 
              key={t.id} 
              onClick={() => generateScripts(t.title)}
              style={{ padding: "14px", background: "#1a1a1a", borderRadius: "8px", marginBottom: "8px", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{i + 1}. {t.title}</strong>
                <span style={{ color: "#4ade80" }}>{t.engagementScore}/100</span>
              </div>
              <p style={{ color: "#888", fontSize: "13px", margin: "5px 0 0 0" }}>{t.angle}</p>
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Scripts */}
      {step === 4 && scripts.length > 0 && (
        <div style={styles.card}>
          <h2 style={{ marginBottom: "10px" }}>Scripts for "{selectedTopic}"</h2>
          {scripts.map((s, i) => {
            const types = ["HOT TAKE", "BREAKDOWN", "STORY"];
            const colors = ["#f59e0b", "#3b82f6", "#ec4899"];
            return (
              <div key={s.id} style={{ padding: "16px", background: "#1a1a1a", borderRadius: "8px", marginBottom: "12px", borderLeft: `3px solid ${colors[i]}` }}>
                <h3 style={{ color: colors[i], marginBottom: "10px" }}>{types[i]}: {s.title}</h3>
                <p style={{ fontSize: "13px" }}><strong style={{ color: "#4ade80" }}>HOOK:</strong> "{s.hook}"</p>
                <p style={{ fontSize: "13px", color: "#aaa" }}><strong style={{ color: "#3b82f6" }}>BODY:</strong> {s.body}</p>
                <p style={{ fontSize: "13px" }}><strong style={{ color: "#ec4899" }}>CTA:</strong> "{s.cta}"</p>
                <button onClick={() => compilePrompt(s)} style={{ ...styles.button(colors[i]), padding: "8px 16px", fontSize: "12px", marginTop: "10px" }}>
                  Use This Script
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 5: Prompt */}
      {step === 5 && compiledPrompt && (
        <div style={styles.card}>
          <h2 style={{ marginBottom: "10px" }}>Video Prompt</h2>
          <div style={{ padding: "12px", background: "#0a0a0a", borderRadius: "8px", fontSize: "11px", whiteSpace: "pre-wrap", maxHeight: "150px", overflow: "auto", marginBottom: "15px" }}>
            {compiledPrompt}
          </div>
          <button onClick={submitVideo} disabled={loading !== null} style={styles.button()}>
            Generate Video (Free)
          </button>
        </div>
      )}

      {/* Step 6: Video */}
      {step === 6 && (
        <div style={styles.card}>
          <h2 style={{ marginBottom: "15px" }}>Video: {videoStatus}</h2>
          {videoUrl && <video src={videoUrl} controls style={{ width: "100%", borderRadius: "8px", maxWidth: "400px", display: "block", margin: "0 auto" }} />}
        </div>
      )}

      {step > 1 && (
        <button onClick={reset} style={{ ...styles.button("transparent"), background: "transparent", border: "1px solid #333", color: "#888", display: "block", margin: "20px auto" }}>
          Start Over
        </button>
      )}
    </div>
  );
}
