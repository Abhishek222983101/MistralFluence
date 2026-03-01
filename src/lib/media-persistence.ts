type AssetKind = "image" | "video";
type PersistStrategy = "none" | "external-endpoint" | "vercel-blob";

export interface AssetRetentionPolicy {
  kind: AssetKind;
  model?: string;
  provider: "piapi";
  guaranteedDays: number | null;
  note: string;
  recommendedPersistBy?: string;
  persisted: boolean;
  strategy: PersistStrategy;
}

type PersistInput = {
  kind: AssetKind;
  sourceUrl: string;
  model?: string;
  userKey?: string;
  characterId?: string;
  jobId?: string;
};

type PersistResult = {
  url: string;
  strategy: Exclude<PersistStrategy, "none">;
};

export async function persistGeneratedAsset(input: PersistInput): Promise<PersistResult | null> {
  const sourceUrl = input.sourceUrl?.trim();
  if (!sourceUrl) return null;

  const viaEndpoint = await persistViaEndpoint(input).catch(() => null);
  if (viaEndpoint) return viaEndpoint;

  const viaBlob = await persistViaVercelBlob(input).catch(() => null);
  if (viaBlob) return viaBlob;

  return null;
}

export function getAssetRetentionPolicy(args: {
  kind: AssetKind;
  model?: string;
  persisted: boolean;
  strategy?: PersistStrategy;
}): AssetRetentionPolicy {
  const strategy = args.strategy ?? "none";

  if (args.persisted) {
    return {
      kind: args.kind,
      model: args.model,
      provider: "piapi",
      guaranteedDays: null,
      note: "Asset copied to app-managed storage.",
      persisted: true,
      strategy,
    };
  }

  if (args.kind === "image") {
    // PiAPI Output Storage docs: generated images are retained for ~3 days.
    const guaranteedDays = 3;
    return {
      kind: "image",
      model: args.model,
      provider: "piapi",
      guaranteedDays,
      note: "PiAPI-hosted image URL is temporary; persist externally for long-term use.",
      recommendedPersistBy: new Date(Date.now() + guaranteedDays * 24 * 60 * 60 * 1000).toISOString(),
      persisted: false,
      strategy,
    };
  }

  if ((args.model ?? "").toLowerCase() === "kling") {
    // PiAPI docs: non-watermarked Kling outputs are retained ~3 days.
    // Watermarked outputs are served from provider CDN with provider-defined lifecycle.
    return {
      kind: "video",
      model: args.model,
      provider: "piapi",
      guaranteedDays: null,
      note: "Kling URL may be short-lived (3 days for non-watermarked, provider-managed for watermarked). Persist externally.",
      persisted: false,
      strategy,
    };
  }

  return {
    kind: "video",
    model: args.model,
    provider: "piapi",
    guaranteedDays: null,
    note: "Provider-hosted video URL lifecycle is not guaranteed; persist externally for reliability.",
    persisted: false,
    strategy,
  };
}

async function persistViaEndpoint(input: PersistInput): Promise<PersistResult | null> {
  const endpoint =
    process.env.MONADFLUENCE_ASSET_PERSIST_ENDPOINT?.trim() ||
    process.env.MOLTFLUENCE_ASSET_PERSIST_ENDPOINT?.trim();
  if (!endpoint) return null;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sourceUrl: input.sourceUrl,
      kind: input.kind,
      model: input.model,
      userKey: input.userKey,
      characterId: input.characterId,
      jobId: input.jobId,
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as { url?: string } | null;
  if (!json?.url || typeof json.url !== "string") return null;
  return { url: json.url, strategy: "external-endpoint" };
}

async function persistViaVercelBlob(input: PersistInput): Promise<PersistResult | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  const importer = new Function("m", "return import(m)") as (m: string) => Promise<any>;
  const blobSdk = await importer("@vercel/blob").catch(() => null);
  if (!blobSdk?.put) return null;

  const src = await fetch(input.sourceUrl, { method: "GET", cache: "no-store" });
  if (!src.ok) return null;

  const contentType = src.headers.get("content-type") ?? guessContentType(input.kind, input.sourceUrl);
  const body = Buffer.from(await src.arrayBuffer());
  const path = buildBlobPath(input, contentType);

  const uploaded = await blobSdk.put(path, body, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });

  if (!uploaded?.url) return null;
  return { url: String(uploaded.url), strategy: "vercel-blob" };
}

function buildBlobPath(input: PersistInput, contentType: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const ext = extensionFromContentType(contentType) ?? extensionFromUrl(input.sourceUrl) ?? defaultExt(input.kind);
  const id = sanitize(input.jobId ?? `${input.kind}-${Date.now()}`);
  return `monadfluence/${input.kind}/${date}/${id}.${ext}`;
}

function extensionFromContentType(contentType: string): string | null {
  const lower = contentType.toLowerCase();
  if (lower.includes("image/png")) return "png";
  if (lower.includes("image/jpeg")) return "jpg";
  if (lower.includes("image/webp")) return "webp";
  if (lower.includes("video/mp4")) return "mp4";
  if (lower.includes("video/webm")) return "webm";
  return null;
}

function extensionFromUrl(urlValue: string): string | null {
  try {
    const url = new URL(urlValue);
    const name = url.pathname.split("/").pop() ?? "";
    const dot = name.lastIndexOf(".");
    if (dot <= 0) return null;
    return sanitize(name.slice(dot + 1).toLowerCase());
  } catch {
    return null;
  }
}

function defaultExt(kind: AssetKind): string {
  return kind === "image" ? "png" : "mp4";
}

function guessContentType(kind: AssetKind, urlValue: string): string {
  const ext = extensionFromUrl(urlValue);
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "png") return "image/png";
  if (ext === "webm") return "video/webm";
  if (ext === "mp4") return "video/mp4";
  return kind === "image" ? "image/png" : "video/mp4";
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}
