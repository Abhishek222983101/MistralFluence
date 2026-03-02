# MistralFluence — AI Influencer Engine

> Fine-tuned Mistral-7B + ElevenLabs TTS + LTX Video + FFmpeg compositing = autonomous AI influencer content pipeline.

Built for the **Mistral Worldwide Hackathon** (hackiterate.com).

**Track:** Fine-tuning | **Challenges:** ElevenLabs + Mistral Vibe

---

## What It Does

MistralFluence is an end-to-end AI influencer engine that turns a character persona into published short-form video content. The full pipeline:

```
Character Creation (PiAPI Flux-dev portrait)
  → Trend Research (Reddit, HackerNews, CoinGecko, Tavily → Mistral synthesis)
  → Script Generation (fine-tuned Mistral-7B LoRA → cloud Mistral fallback)
  → Prompt Compilation (Mistral Cloud → video-ready prompt)
  → Video + Voice Generation (LTX-2 video ‖ ElevenLabs TTS → FFmpeg composite)
  → Final MP4 with synced voice narration
```

Every step is accessible through both a web UI and a programmatic API.

## Fine-Tuned Model

**Model:** [`Abhishek1445/mistralfluence-content-generator-7b`](https://huggingface.co/Abhishek1445/mistralfluence-content-generator-7b)

- Base: `mistralai/Mistral-7B-Instruct-v0.3`
- LoRA fine-tuned on ~199 character-aware influencer script examples
- Trained with W&B experiment tracking
- Generates 3 script variants (HOT TAKE, BREAKDOWN, STORY) per topic
- Character-aware: adapts tone, slang, and energy to persona vibe/role/aggressiveness

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Next.js App                │
│                                             │
│  Landing (/page.tsx)                        │
│  Pipeline UI (/full-e2e/page.tsx)           │
│  Character Creator (/create/page.tsx)       │
│  Content Studio (/studio/page.tsx)          │
│                                             │
├─────────────────────────────────────────────┤
│                  API Routes                 │
│                                             │
│  /api/state/character    Character CRUD     │
│  /api/swarm/trends       Trend harvesting   │
│  /api/swarm/scripts      Script generation  │
│  /api/swarm/prompt-compile  Prompt compiler │
│  /api/x402/generate-image   Image gen       │
│  /api/x402/generate-video   Video + voice   │
│  /api/skills/[name]      Agent skill server │
│                                             │
├─────────────────────────────────────────────┤
│              Core Libraries                 │
│                                             │
│  src/lib/llm.ts          Hybrid LLM router  │
│    ├─ Local Mistral-7B LoRA (FastAPI)       │
│    └─ Cloud Mistral fallback                │
│  src/lib/voice/elevenlabs.ts  ElevenLabs    │
│  src/lib/voice/composite.ts   FFmpeg merge  │
│  src/lib/videoGen/ltx.ts      LTX adapter   │
│  src/lib/monadfluence/swarm/  Pipeline core │
│                                             │
└─────────────────────────────────────────────┘
```

### Hybrid LLM Strategy

The script generation endpoint uses a **local-first** approach:

1. **Primary:** Fine-tuned Mistral-7B LoRA running on a local FastAPI server (GPU inference)
2. **Fallback:** Mistral Cloud API (`mistral-large-latest`) when local server is unavailable

This gives the best of both worlds: custom character-tuned output when running locally, with reliable cloud fallback for deployment.

## Voice Integration (ElevenLabs)

Scripts are automatically narrated using ElevenLabs TTS:

- **Vibe-aware voice selection:** Each character vibe x role combination maps to an optimal ElevenLabs voice
- **Auto-compositing:** Generated voice audio is merged with LTX video output using FFmpeg
- **Sync:** Audio duration drives video generation parameters for natural pacing

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, Three.js (R3F) |
| LLM (fine-tuned) | Mistral-7B-Instruct-v0.3 + LoRA |
| LLM (cloud) | Mistral Large (mistral-large-latest) |
| Voice | ElevenLabs TTS API |
| Video | LTX-2-fast |
| Image | PiAPI Flux-dev |
| Compositing | FFmpeg |
| Training | Unsloth, TRL, PEFT, W&B |
| Trend Sources | Reddit, HackerNews, CoinGecko, Tavily |

## Getting Started

### Prerequisites

- Node.js 18+
- FFmpeg installed (`ffmpeg` on PATH)
- (Optional) NVIDIA GPU for local inference

### Installation

```bash
git clone https://github.com/Abhishek1445/MistralFluence.git
cd MistralFluence
npm install
```

### Environment Variables

Create a `.env` file:

```env
# Required
MISTRAL_API_KEY=your_mistral_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
PIAPI_KEY=your_piapi_key
LTX_API_KEY=your_ltx_api_key

# API key gate
ALLOWED_API_KEYS=mistral2026

# Set to true to avoid spending API credits during development
DRY_RUN_APIS=true

# Optional - for trend research
OPENROUTER_API_KEY=your_openrouter_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

### Local Inference Server (Optional)

To run the fine-tuned model locally:

```bash
python -m venv .venv
source .venv/bin/activate
pip install torch transformers peft fastapi uvicorn
python scripts/serve_model.py
```

The FastAPI server runs on port 8000. The app auto-detects it and routes script generation through the local model.

## API Reference

All API endpoints accept `x-api-key: mistral2026` for authentication.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state/character` | GET/POST | Character profile CRUD |
| `/api/swarm/trends` | POST | Trend research (auto or manual topic) |
| `/api/swarm/scripts` | POST | Generate 3 script variants |
| `/api/swarm/prompt-compile` | POST | Compile video-ready prompt |
| `/api/x402/generate-image` | POST | Generate character portrait |
| `/api/x402/generate-video` | POST | Generate video with optional voice |
| `/api/skills/mistralfluence-agent` | GET | Agent skill file (for bot platforms) |

## Agent Skill

MistralFluence exposes a unified agent skill at `/api/skills/mistralfluence-agent` for integration with bot platforms like OpenClaw. The skill provides step-by-step instructions for autonomous content creation.

## Project Structure

```
MistralFluence/
├── app/                    # Next.js app router pages + API routes
│   ├── api/                # All API endpoints
│   ├── full-e2e/           # Main pipeline UI
│   ├── create/             # Character creation wizard
│   └── studio/             # Content studio
├── src/lib/                # Core libraries
│   ├── llm.ts              # Hybrid LLM (local + cloud)
│   ├── voice/              # ElevenLabs + FFmpeg
│   ├── videoGen/           # LTX adapter
│   └── monadfluence/       # Pipeline orchestration
├── components/             # React components
│   ├── hero/               # 3D avatar sphere (Three.js)
│   └── sections/           # Landing page sections
├── scripts/                # Training + inference scripts
│   ├── finetune.py         # LoRA fine-tuning script
│   ├── generate-dataset.ts # Dataset generation
│   ├── serve_model.py      # Local inference server
│   └── upload_to_hf.py     # HuggingFace upload
├── skills/                 # Agent skill definitions
│   └── mistralfluence-agent/SKILL.md
├── public/avatars/         # 120 avatar images for 3D sphere
└── dataset.jsonl           # Training dataset (~199 examples)
```

## Training Details

- **Dataset:** ~199 examples generated via grounded distillation from Mistral Large
- **Method:** LoRA fine-tuning (rank 16, alpha 32)
- **Training:** 3 epochs, lr 2e-4, bf16 precision
- **Framework:** Unsloth + TRL SFTTrainer
- **Logging:** Weights & Biases

## Hackathon Submission

- **Track:** Fine-tuning
- **Challenges:** ElevenLabs + Mistral Vibe
- **HuggingFace Model:** [Abhishek1445/mistralfluence-content-generator-7b](https://huggingface.co/Abhishek1445/mistralfluence-content-generator-7b)
- **Live Demo:** [mistralfluence.vercel.app](https://mistralfluence.vercel.app)

## License

MIT
