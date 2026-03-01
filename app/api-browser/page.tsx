"use client";

import { useState } from "react";

const API_BASE = "https://monadfluencemonad.vercel.app";

type Topic = {
  id: string;
  title: string;
  angle: string;
  whyNow: string;
  hookIdea: string;
  controversyScore: number;
  engagementScore: number;
  visualConcept: string;
};

type Script = {
  id: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  durationTargetSec: number;
};

export default function APIBrowserPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async (niche: string) => {
    setLoading(`Fetching ${niche} trends...`);
    setError(null);
    setScripts([]);
    setSelectedTopic(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/swarm/trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      setTopics(data.topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trends");
    } finally {
      setLoading(null);
    }
  };

  const fetchScripts = async (topic: string) => {
    setLoading("Generating scripts...");
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/swarm/scripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterProfile: {
            id: "browser-api-test",
            niche: "crypto",
            characterType: "analyst",
            vibe: "confident",
            role: "commentator",
            language: "en",
            aggressiveness: "safe",
          },
          topic,
          mode: "manual-topic",
        }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      setScripts(data.scripts);
      setSelectedTopic(topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate scripts");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ 
      fontFamily: "system-ui, sans-serif", 
      maxWidth: "900px", 
      margin: "0 auto", 
      padding: "20px",
      backgroundColor: "#0a0a0a",
      color: "#fff",
      minHeight: "100vh"
    }}>
      <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>🎬 Moltfluence API Browser</h1>
      <p style={{ color: "#888", marginBottom: "30px" }}>
        OpenClaw bot can use this page to interact with the Moltfluence API
      </p>

      {/* Step 1: Select Niche */}
      <section style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "15px", color: "#4ade80" }}>
          Step 1: Select Niche
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => fetchTrends("crypto")}
            disabled={loading !== null}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: "#f59e0b",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "wait" : "pointer",
              fontWeight: "bold"
            }}
          >
            🪙 Crypto
          </button>
          <button 
            onClick={() => fetchTrends("tech")}
            disabled={loading !== null}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: "#3b82f6",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "wait" : "pointer",
              fontWeight: "bold"
            }}
          >
            💻 Tech
          </button>
          <button 
            onClick={() => fetchTrends("memes")}
            disabled={loading !== null}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              backgroundColor: "#ec4899",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "wait" : "pointer",
              fontWeight: "bold"
            }}
          >
            😂 Memes
          </button>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div style={{ 
          padding: "20px", 
          backgroundColor: "#1f2937", 
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          ⏳ {loading}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ 
          padding: "20px", 
          backgroundColor: "#7f1d1d", 
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          ❌ {error}
        </div>
      )}

      {/* Step 2: Topics List */}
      {topics.length > 0 && (
        <section style={{ marginBottom: "30px" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "15px", color: "#4ade80" }}>
            Step 2: Select a Topic ({topics.length} trending)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topics.map((topic, i) => (
              <div 
                key={topic.id}
                style={{ 
                  padding: "15px", 
                  backgroundColor: "#1f2937", 
                  borderRadius: "8px",
                  border: selectedTopic === topic.title ? "2px solid #4ade80" : "none"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
                  <h3 style={{ fontSize: "18px", margin: 0 }}>
                    {i + 1}. {topic.title}
                  </h3>
                  <span style={{ 
                    backgroundColor: "#4ade80", 
                    color: "#000", 
                    padding: "4px 8px", 
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}>
                    {topic.engagementScore}/100
                  </span>
                </div>
                <p style={{ color: "#9ca3af", margin: "5px 0" }}>
                  <strong>Angle:</strong> {topic.angle}
                </p>
                <p style={{ color: "#9ca3af", margin: "5px 0" }}>
                  <strong>Hook:</strong> "{topic.hookIdea}"
                </p>
                <button
                  onClick={() => fetchScripts(topic.title)}
                  disabled={loading !== null}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    backgroundColor: "#4ade80",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  Generate Scripts for this Topic
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Step 3: Scripts */}
      {scripts.length > 0 && (
        <section>
          <h2 style={{ fontSize: "20px", marginBottom: "15px", color: "#4ade80" }}>
            Step 3: Generated Scripts for "{selectedTopic}"
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {scripts.map((script, i) => {
              const types = ["🔥 HOT TAKE", "📊 BREAKDOWN", "📖 STORY"];
              return (
                <div 
                  key={script.id}
                  style={{ 
                    padding: "20px", 
                    backgroundColor: "#1f2937", 
                    borderRadius: "8px",
                    border: "1px solid #374151"
                  }}
                >
                  <h3 style={{ fontSize: "18px", marginBottom: "15px", color: "#f59e0b" }}>
                    {types[i]}: {script.title}
                  </h3>
                  
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#4ade80" }}>🎣 HOOK (0-2s):</strong>
                    <p style={{ margin: "5px 0", color: "#fff", fontSize: "16px" }}>
                      "{script.hook}"
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: "15px" }}>
                    <strong style={{ color: "#3b82f6" }}>📄 BODY (2-18s):</strong>
                    <p style={{ margin: "5px 0", color: "#d1d5db", lineHeight: "1.6" }}>
                      {script.body}
                    </p>
                  </div>
                  
                  <div>
                    <strong style={{ color: "#ec4899" }}>📢 CTA (18-22s):</strong>
                    <p style={{ margin: "5px 0", color: "#fff", fontSize: "16px" }}>
                      "{script.cta}"
                    </p>
                  </div>
                  
                  <div style={{ marginTop: "15px", color: "#6b7280", fontSize: "14px" }}>
                    ⏱️ Duration: {script.durationTargetSec}s
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Instructions for OpenClaw */}
      <section style={{ 
        marginTop: "40px", 
        padding: "20px", 
        backgroundColor: "#1e3a5f", 
        borderRadius: "8px" 
      }}>
        <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>🤖 Instructions for OpenClaw Bot</h2>
        <ol style={{ color: "#9ca3af", margin: 0, paddingLeft: "20px" }}>
          <li>Click one of the niche buttons (Crypto, Tech, or Memes)</li>
          <li>Wait for topics to load</li>
          <li>Click "Generate Scripts" on any topic</li>
          <li>Read the 3 script variants to the user</li>
        </ol>
      </section>
    </div>
  );
}
