import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, join } from "path";
import type {
  CharacterProfile,
  ContentBrief,
  GenerationRecord,
  QuotaState,
  StateDocument,
  VideoModel,
  VideoTier,
  ResearchCache,
  ScheduledPost,
} from "./types";
import { VIDEO_MODELS } from "./types";

type StateAdapter = {
  read(): Promise<StateDocument>;
  write(doc: StateDocument): Promise<void>;
};

const DEFAULT_TIERS: Record<VideoTier, number> = {
  basic: 3,
  pro: 1,
  ultra: 1,
};

let inMemoryDoc: StateDocument | null = null;

class MemoryAdapter implements StateAdapter {
  async read(): Promise<StateDocument> {
    if (!inMemoryDoc) inMemoryDoc = makeDefaultDocument();
    return structuredClone(inMemoryDoc);
  }

  async write(doc: StateDocument): Promise<void> {
    inMemoryDoc = structuredClone(doc);
  }
}

class FileAdapter implements StateAdapter {
  constructor(private readonly filepath: string) {}

  async read(): Promise<StateDocument> {
    try {
      const raw = await readFile(this.filepath, "utf-8");
      const parsed = JSON.parse(raw) as StateDocument;
      return normalizeDocument(parsed);
    } catch {
      return makeDefaultDocument();
    }
  }

  async write(doc: StateDocument): Promise<void> {
    const safeDoc = normalizeDocument(doc);
    safeDoc.updatedAt = nowIso();

    await mkdir(dirname(this.filepath), { recursive: true });

    const tmp = `${this.filepath}.tmp`;
    await writeFile(tmp, JSON.stringify(safeDoc, null, 2), "utf-8");
    await rename(tmp, this.filepath);
  }
}

function getAdapter(): StateAdapter {
  const adapter = (process.env.MONADFLUENCE_STATE_ADAPTER ?? process.env.MOLTFLUENCE_STATE_ADAPTER ?? "file").toLowerCase();
  if (adapter === "memory") return new MemoryAdapter();

  const path = resolveStatePath();
  return new FileAdapter(path);
}

function resolveStatePath(): string {
  const configured = process.env.MONADFLUENCE_STATE_FILE?.trim() || process.env.MOLTFLUENCE_STATE_FILE?.trim();

  if (configured && configured.length > 0) {
    if (process.env.VERCEL && !configured.startsWith("/tmp/")) {
      const basename = configured.split("/").filter(Boolean).pop() || "monadfluence-state.json";
      return `/tmp/${basename}`;
    }
    return configured;
  }

  return process.env.VERCEL ? "/tmp/monadfluence-state.json" : join(process.cwd(), ".data", "monadfluence-state.json");
}

export async function saveCharacterProfile(input: Omit<CharacterProfile, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<CharacterProfile> {
  const adapter = getAdapter();
  const doc = await adapter.read();
  const character: CharacterProfile = {
    id: input.id ?? makeId("char"),
    createdAt: input.createdAt ?? nowIso(),
    ...input,
  };

  const index = doc.characters.findIndex((c) => c.id === character.id);
  if (index >= 0) doc.characters[index] = character;
  else doc.characters.push(character);

  await adapter.write(doc);
  return character;
}

export async function getCharacterProfile(userKey: string, characterId?: string): Promise<CharacterProfile | null> {
  const doc = await getAdapter().read();

  if (characterId) {
    return doc.characters.find((c) => c.id === characterId && c.userKey === userKey) ?? null;
  }

  const matches = doc.characters.filter((c) => c.userKey === userKey);
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export async function saveContentBrief(input: Omit<ContentBrief, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<ContentBrief> {
  const adapter = getAdapter();
  const doc = await adapter.read();

  const brief: ContentBrief = {
    id: input.id ?? makeId("brief"),
    createdAt: input.createdAt ?? nowIso(),
    ...input,
  };

  const index = doc.contentBriefs.findIndex((b) => b.id === brief.id);
  if (index >= 0) doc.contentBriefs[index] = brief;
  else doc.contentBriefs.push(brief);

  await adapter.write(doc);
  return brief;
}

export async function recordGeneration(record: GenerationRecord): Promise<void> {
  const adapter = getAdapter();
  const doc = await adapter.read();

  const idx = doc.generations.findIndex((g) => g.jobId === record.jobId);
  if (idx >= 0) doc.generations[idx] = record;
  else doc.generations.push(record);

  await adapter.write(doc);
}

export async function getGeneration(jobId: string): Promise<GenerationRecord | null> {
  const doc = await getAdapter().read();
  return doc.generations.find((g) => g.jobId === jobId) ?? null;
}

export async function updateGeneration(jobId: string, patch: Partial<GenerationRecord>): Promise<GenerationRecord | null> {
  const adapter = getAdapter();
  const doc = await adapter.read();
  const idx = doc.generations.findIndex((g) => g.jobId === jobId);
  if (idx < 0) return null;

  const next: GenerationRecord = {
    ...doc.generations[idx],
    ...patch,
    updatedAt: nowIso(),
  };

  doc.generations[idx] = next;
  await adapter.write(doc);
  return next;
}

export async function createRetryGeneration(oldJobId: string, newJobId: string, newModel: VideoModel): Promise<GenerationRecord | null> {
  const prev = await getGeneration(oldJobId);
  if (!prev) return null;

  const retry: GenerationRecord = {
    ...prev,
    parentJobId: prev.jobId,
    jobId: newJobId,
    modelUsed: newModel,
    retries: prev.retries + 1,
    status: "processing",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    error: undefined,
    videoUrl: undefined,
    qa: undefined,
  };

  await recordGeneration(retry);
  await updateGeneration(oldJobId, {
    status: "failed",
    error: prev.error ?? "Retry submitted",
  });

  return retry;
}

export async function getQuotaState(userKey: string): Promise<QuotaState> {
  const adapter = getAdapter();
  const doc = await adapter.read();
  const state = ensureQuotaState(doc, userKey);
  await adapter.write(doc);
  return state;
}

export async function consumeFreeQuota(userKey: string, tier: VideoTier, model: VideoModel): Promise<{ usedFree: boolean; quota: QuotaState }> {
  const adapter = getAdapter();
  const doc = await adapter.read();
  const quota = ensureQuotaState(doc, userKey);

  if (quota.tiers[tier].remaining <= 0) {
    return { usedFree: false, quota };
  }

  quota.tiers[tier].used += 1;
  quota.tiers[tier].remaining = Math.max(0, quota.tiers[tier].limit - quota.tiers[tier].used);
  quota.models[model].used += 1;
  quota.updatedAt = nowIso();

  doc.quota[userKey] = quota;
  await adapter.write(doc);

  return { usedFree: true, quota };
}

export async function listQuota(): Promise<Record<string, QuotaState>> {
  const doc = await getAdapter().read();
  return doc.quota;
}

export async function listAllCharacters(): Promise<CharacterProfile[]> {
  const doc = await getAdapter().read();
  return doc.characters;
}

export async function getValidResearchCache(niche: string): Promise<ResearchCache | null> {
  const doc = await getAdapter().read();
  const cache = doc.researchCache[niche];
  if (!cache) return null;

  const now = new Date();
  const expiresAt = new Date(cache.expiresAt);
  if (now >= expiresAt) return null;

  return cache;
}

export async function saveResearchCache(cache: ResearchCache): Promise<void> {
  const adapter = getAdapter();
  const doc = await adapter.read();
  doc.researchCache[cache.niche] = cache;
  await adapter.write(doc);
}

export async function schedulePost(post: Omit<ScheduledPost, "id" | "createdAt" | "status">): Promise<ScheduledPost> {
  const adapter = getAdapter();
  const doc = await adapter.read();

  const newPost: ScheduledPost = {
    ...post,
    id: makeId("sched"),
    status: "pending",
    createdAt: nowIso(),
  };

  doc.scheduledPosts.push(newPost);
  await adapter.write(doc);
  return newPost;
}

export async function getScheduledPosts(userKey?: string): Promise<ScheduledPost[]> {
  const doc = await getAdapter().read();
  if (userKey) {
    return doc.scheduledPosts.filter((p) => p.userKey === userKey);
  }
  return doc.scheduledPosts;
}

export async function getScheduledPost(id: string): Promise<ScheduledPost | null> {
  const doc = await getAdapter().read();
  return doc.scheduledPosts.find((p) => p.id === id) ?? null;
}

export async function updateScheduledPost(id: string, patch: Partial<ScheduledPost>): Promise<ScheduledPost | null> {
  const adapter = getAdapter();
  const doc = await adapter.read();
  const idx = doc.scheduledPosts.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  doc.scheduledPosts[idx] = {
    ...doc.scheduledPosts[idx],
    ...patch,
  };
  await adapter.write(doc);
  return doc.scheduledPosts[idx];
}

export async function deleteScheduledPost(id: string): Promise<boolean> {
  const adapter = getAdapter();
  const doc = await adapter.read();
  const idx = doc.scheduledPosts.findIndex((p) => p.id === id);
  if (idx < 0) return false;

  doc.scheduledPosts.splice(idx, 1);
  await adapter.write(doc);
  return true;
}

export async function getDueScheduledPosts(): Promise<ScheduledPost[]> {
  const doc = await getAdapter().read();
  const now = new Date();
  return doc.scheduledPosts.filter((p) => p.status === "pending" && new Date(p.scheduledFor) <= now);
}

function ensureQuotaState(doc: StateDocument, userKey: string): QuotaState {
  if (!doc.quota[userKey]) {
    doc.quota[userKey] = {
      userKey,
      updatedAt: nowIso(),
      tiers: {
        basic: makeTier("basic"),
        pro: makeTier("pro"),
        ultra: makeTier("ultra"),
      },
      models: makeModelUsageMap(),
    };
  }

  for (const model of VIDEO_MODELS) {
    if (!doc.quota[userKey].models[model]) {
      doc.quota[userKey].models[model] = { used: 0 };
    }
  }

  return doc.quota[userKey];
}

function makeTier(tier: VideoTier) {
  const limit = DEFAULT_TIERS[tier];
  return {
    limit,
    used: 0,
    remaining: limit,
  };
}

function normalizeDocument(doc: StateDocument): StateDocument {
  return {
    version: 1,
    updatedAt: doc.updatedAt ?? nowIso(),
    characters: Array.isArray(doc.characters) ? doc.characters : [],
    contentBriefs: Array.isArray(doc.contentBriefs) ? doc.contentBriefs : [],
    generations: Array.isArray(doc.generations) ? doc.generations : [],
    quota: doc.quota ?? {},
    researchCache: doc.researchCache ?? {},
    scheduledPosts: Array.isArray(doc.scheduledPosts) ? doc.scheduledPosts : [],
  };
}

function makeModelUsageMap(): Record<VideoModel, { used: number }> {
  return VIDEO_MODELS.reduce(
    (acc, model) => {
      acc[model] = { used: 0 };
      return acc;
    },
    {} as Record<VideoModel, { used: number }>,
  );
}

function makeDefaultDocument(): StateDocument {
  return {
    version: 1,
    updatedAt: nowIso(),
    characters: [],
    contentBriefs: [],
    generations: [],
    quota: {},
    researchCache: {},
    scheduledPosts: [],
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}
