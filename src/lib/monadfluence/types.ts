export const VIDEO_MODELS = ["ltx"] as const;
export type VideoModel = (typeof VIDEO_MODELS)[number];
export const RECOMMENDED_VIDEO_MODEL: VideoModel = "ltx";
export type VideoTier = "basic" | "pro" | "ultra";
export type ContentAggressiveness = "safe" | "spicy";

export interface CharacterProfile {
  id: string;
  userKey: string;
  niche: string;
  characterType: string;
  vibe: string;
  role: string;
  language: string;
  aggressiveness: ContentAggressiveness;
  brand?: string;
  exclusions: string[];
  imageUrl?: string;
  imagePrompt?: string;
  styleGuide?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface ContentBrief {
  id: string;
  userKey: string;
  characterId?: string;
  mode: "auto-trends" | "manual-topic";
  niche: string;
  topic: string;
  objective?: string;
  createdAt: string;
}

export interface ScriptDraft {
  id: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  durationTargetSec: number;
}

export interface PromptPackage {
  id: string;
  primaryModel: VideoModel;
  fallbackModel: VideoModel;
  primaryPrompt: string;
  fallbackPrompt: string;
  lint: {
    passed: boolean;
    issues: string[];
  };
  metadata: {
    hook: string;
    cta: string;
    consistencyTokens: string[];
  };
}

export interface TierQuota {
  limit: number;
  used: number;
  remaining: number;
}

export interface QuotaState {
  userKey: string;
  updatedAt: string;
  tiers: Record<VideoTier, TierQuota>;
  models: Record<VideoModel, { used: number }>;
}

export interface CaptionSegment {
  text: string;
  start: number;
  end: number;
}

export interface ResearchItem {
  id: string;
  source: string;
  title: string;
  url: string;
  score: number;
  comments: number;
  subreddit?: string;
  createdAt: string;
  raw: Record<string, any>;
}

export interface SynthesizedTopic {
  id: string;
  title: string;
  angle: string;
  whyNow: string;
  hookIdea: string;
  controversyScore: number;
  engagementScore: number;
  visualConcept: string;
  sources: string[];
}

export interface ResearchCache {
  niche: string;
  timestamp: string;
  expiresAt: string;
  rawItemCount: number;
  topItems: ResearchItem[];
  synthesizedTopics: SynthesizedTopic[];
}

export interface ScheduledPost {
  id: string;
  userKey: string;
  characterId: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  scheduledFor: string; // ISO string
  status: "pending" | "processing" | "published" | "failed";
  createdAt: string;
  publishedAt?: string;
  mediaId?: string;
  reelUrl?: string;
  error?: string;
}

export interface GenerationRecord {
  jobId: string;
  parentJobId?: string;
  userKey: string;
  characterId?: string;
  modelRequested: VideoModel;
  modelUsed: VideoModel;
  tier: VideoTier;
  prompt: string;
  duration: number;
  aspectRatio: string;
  voice?: boolean;
  referenceImageUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  retries: number;
  createdAt: string;
  updatedAt: string;
  videoUrl?: string;
  captionedVideoUrl?: string;
  error?: string;
  paid: boolean;
  payment?: {
    txSignature: string;
    payer?: string;
    network?: string;
    asset?: string;
  };
  qa?: {
    passed: boolean;
    checks: Record<string, { passed: boolean; detail: string }>;
  };
}

export interface StateDocument {
  version: 1;
  updatedAt: string;
  characters: CharacterProfile[];
  contentBriefs: ContentBrief[];
  generations: GenerationRecord[];
  quota: Record<string, QuotaState>;
  researchCache: Record<string, ResearchCache>;
  scheduledPosts: ScheduledPost[];
}
