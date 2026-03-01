#!/usr/bin/env python3
"""
MistralFluence Local Inference Server (Phase 2D)

FastAPI server that loads Mistral-7B-Instruct-v0.3 with our fine-tuned LoRA adapter
and exposes a POST /generate endpoint for the Node.js backend.

Hybrid Architecture:
  - Mistral Cloud API  -> fast reasoning (topics, image prompts)
  - This local server   -> heavy script generation (saves API costs, uses RTX 5050)

Usage:
  cd /home/arch-nitro/MistralFluence
  source .venv/bin/activate
  uvicorn scripts.serve_model:app --host 0.0.0.0 --port 8000
"""

import os
import json
import time
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel


# ---------------------------------------------------------------------------
# Configuration (matches test_inference.py exactly)
# ---------------------------------------------------------------------------
BASE_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
ADAPTER_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "mistralfluence-7b-lora",
)

# Global holders -- populated at startup
model = None
tokenizer = None


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class ProfilePayload(BaseModel):
    niche: str = "general"
    vibe: str = "engaging"
    role: str = "creator"
    language: str = "English"
    aggressiveness: str = "safe"
    styleGuide: str = "Engaging, authentic, scroll-stopping"


class BriefPayload(BaseModel):
    topic: str
    objective: str = ""


class GenerateRequest(BaseModel):
    profile: ProfilePayload
    brief: BriefPayload


class GenerateResponse(BaseModel):
    content: str
    generation_time_sec: float


# ---------------------------------------------------------------------------
# Model loading (runs once at startup)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model into VRAM on startup, free on shutdown."""
    global model, tokenizer

    print("=" * 60)
    print("MISTRALFLUENCE LOCAL INFERENCE SERVER")
    print("=" * 60)

    if not os.path.isdir(ADAPTER_PATH):
        raise RuntimeError(
            f"LoRA adapter not found at {ADAPTER_PATH}. Did you run finetune.py first?"
        )

    # 1. 4-bit quantization config (identical to test_inference.py)
    print("\n1. Configuring 4-bit quantization (for 8GB VRAM)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    # 2. Load base model
    print("2. Loading base model: Mistral-7B-Instruct-v0.3...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    # 3. Load tokenizer
    print("3. Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL,
        trust_remote_code=True,
    )

    # 4. Attach LoRA adapter
    print(f"4. Attaching LoRA adapter from '{ADAPTER_PATH}'...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)

    vram_gb = torch.cuda.memory_allocated() / 1024**3
    print(f"\nModel loaded! GPU Memory: {vram_gb:.2f} GB")
    print(f"Server ready at http://0.0.0.0:8000")
    print("=" * 60)

    yield  # Server runs here

    # Cleanup on shutdown
    print("Shutting down, freeing VRAM...")
    del model, tokenizer
    torch.cuda.empty_cache()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MistralFluence Local Inference",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health_check():
    """Health check for the Node.js backend to verify server is ready."""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "gpu_memory_gb": round(torch.cuda.memory_allocated() / 1024**3, 2),
    }


@app.post("/generate", response_model=GenerateResponse)
def generate_scripts(req: GenerateRequest):
    """
    Generate 3 script variants using the local fine-tuned model.

    This endpoint mirrors exactly what generateCreativeScripts() in llm.ts
    was doing via the Mistral Cloud API, but runs locally on the RTX 5050.
    """
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    # Build the prompt using the EXACT same format the model was trained on
    # (matches the ChatML structure from finetune.py / test_inference.py)
    system_prompt = f"""You are MistralFluence ScriptWriter, a specialized AI that writes viral short-form video scripts for social media influencers.

CHARACTER PROFILE:
- Niche: {req.profile.niche}
- Vibe: {req.profile.vibe}
- Role: {req.profile.role}
- Language: {req.profile.language}
- Aggressiveness: {req.profile.aggressiveness}

YOUR TASK:
Given real-time trending data and a specific topic, write exactly 3 script variants for a 22-second vertical video (Instagram Reels / TikTok).

OUTPUT FORMAT (strict JSON):
{{
  "scripts": [
    {{
      "variant": "hot-take",
      "title": "Short title (max 8 words)",
      "hook": "Opening line (0-2 seconds, must stop the scroll)",
      "body": "Main content (2-18 seconds, one core message with proof)",
      "cta": "Call-to-action (18-22 seconds, drive engagement)"
    }},
    ...
  ]
}}

RULES:
- Return ONLY the JSON object, no markdown, no explanation
- Write in {req.profile.language}
- Match the {req.profile.vibe} energy level throughout"""

    if req.profile.aggressiveness == "spicy":
        system_prompt += "\n- Use edgy, provocative, confrontational language. Be bold and polarizing."
    else:
        system_prompt += "\n- Keep it informative but engaging. Be authoritative without being aggressive."

    user_prompt = f"""Niche: {req.profile.niche}
Topic: {req.brief.topic}
{f"Objective: {req.brief.objective}" if req.brief.objective else ""}

Write 3 script variants (hot-take, breakdown, story) for the topic above."""

    # Format as ChatML (exactly how the model was trained)
    chat = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    prompt = tokenizer.apply_chat_template(
        chat, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

    # Generate
    start_time = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=1500,
            temperature=0.8,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    generation_time = time.time() - start_time

    # Decode only the new tokens (strip the prompt)
    response = tokenizer.decode(
        outputs[0][inputs.input_ids.shape[1] :], skip_special_tokens=True
    )

    # Clean up markdown fences if the model hallucinates them
    cleaned = response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Validate JSON before returning
    try:
        json.loads(cleaned)
    except json.JSONDecodeError:
        print(
            f"[serve_model] WARNING: Model output was not valid JSON. Raw: {cleaned[:200]}"
        )
        # Still return it -- the Node.js side has its own error handling

    print(
        f"[serve_model] Generated in {generation_time:.1f}s | Length: {len(cleaned)} chars"
    )

    return GenerateResponse(
        content=cleaned,
        generation_time_sec=round(generation_time, 2),
    )
