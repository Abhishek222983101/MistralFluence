#!/usr/bin/env python3
"""
Phase 2D: Local Inference Test
This script loads the Mistral 7B base model and attaches your newly trained LoRA adapter.
It then runs a test prompt locally on your RTX 5050 to prove the fine-tuning worked.
"""

import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel
import json

# Configuration
BASE_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
ADAPTER_PATH = "models/mistralfluence-7b-lora"


def main():
    print("=" * 60)
    print("🧪 MISTRALFLUENCE LOCAL INFERENCE TEST")
    print("=" * 60)

    print("\n1. Configuring 4-bit Quantization (for 8GB VRAM)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    print("2. Loading Base Model: Mistral-7B-Instruct-v0.3...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    print("3. Loading Tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL,
        trust_remote_code=True,
    )

    print(f"4. Attaching your trained LoRA Adapter from '{ADAPTER_PATH}'...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)

    print("\n✅ Model successfully loaded into VRAM!")
    print(f"GPU Memory Used: {torch.cuda.memory_allocated() / 1024**3:.2f} GB\n")

    # ---------------------------------------------------------
    # TEST THE MODEL
    # ---------------------------------------------------------
    test_topic = "Apple (AAPL) stock just crashed 5% after a new product flop"

    print("=" * 60)
    print(f"🎯 TESTING WITH TOPIC: {test_topic}")
    print("=" * 60)

    # Format the prompt exactly how it was in the dataset
    system_prompt = """You are MistralFluence ScriptWriter, a specialized AI that writes viral short-form video scripts for social media influencers.

CHARACTER PROFILE:
- Niche: finance
- Vibe: savage
- Role: commentator
- Language: English
- Aggressiveness: spicy

YOUR TASK:
Given real-time trending data and a specific topic, write exactly 3 script variants for a 22-second vertical video (Instagram Reels / TikTok).

OUTPUT FORMAT (strict JSON):
{
  "scripts": [
    {
      "variant": "hot-take",
      "title": "Short title (max 8 words)",
      "hook": "Opening line (0-2 seconds, must stop the scroll)",
      "body": "Main content (2-18 seconds, one core message with proof)",
      "cta": "Call-to-action (18-22 seconds, drive engagement)"
    },
    ...
  ]
}

RULES:
- Return ONLY the JSON object, no markdown, no explanation"""

    user_prompt = f"""Niche: finance
Topic: {test_topic}

REAL-TIME RESEARCH DATA:
1. "Apple stock drops 5% after latest AR glasses fail to impress"
   Source: reddit (r/wallstreetbets)
   Engagement: Score 8500 | Comments: 1200 | Ranked: 95/100
   Price Change 24h: -5.1%

Write 3 script variants (hot-take, breakdown, story) for the topic above, grounded in the real data provided."""

    # Use ChatML formatting (which the model was trained on)
    chat = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    prompt = tokenizer.apply_chat_template(
        chat, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

    print(
        "⏳ Generating scripts locally on your RTX 5050... (This takes a few seconds)"
    )

    # Generate output
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=512,  # Enough for the JSON
            temperature=0.7,  # A bit of creativity
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # Decode and extract just the assistant's reply
    response = tokenizer.decode(
        outputs[0][inputs.input_ids.shape[1] :], skip_special_tokens=True
    )

    print("\n" + "=" * 60)
    print("✨ GENERATED OUTPUT (Raw JSON from Model):")
    print("=" * 60)
    print(response)
    print("=" * 60)

    # Verify it's valid JSON
    try:
        json.loads(response)
        print("\n✅ SUCCESS: The output is perfectly valid JSON!")
    except json.JSONDecodeError:
        print(
            "\n⚠️ WARNING: The output is not valid JSON. (It might need slightly more training or a lower temperature)"
        )


if __name__ == "__main__":
    main()
