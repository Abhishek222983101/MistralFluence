import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, join } from "path";

export interface InstagramConnection {
  accessToken: string;
  instagramUserId: string;
  pageId?: string;
  pageName?: string;
  username?: string;
  tokenType?: string;
  expiresIn?: number;
  connectedAt: string;
}

const DEFAULT_FILE = process.env.VERCEL
  ? "/tmp/instagram-connection.json"
  : join(process.cwd(), ".data", "instagram-connection.json");

function getFilePath(): string {
  const configured =
    process.env.MONADFLUENCE_INSTAGRAM_STATE_FILE?.trim() ||
    process.env.MOLTFLUENCE_INSTAGRAM_STATE_FILE?.trim();
  if (configured && configured.length > 0) {
    if (process.env.VERCEL && !configured.startsWith("/tmp/")) {
      const basename = configured.split("/").filter(Boolean).pop() || "instagram-connection.json";
      return `/tmp/${basename}`;
    }
    return configured;
  }
  return DEFAULT_FILE;
}

export async function getInstagramConnection(): Promise<InstagramConnection | null> {
  const path = getFilePath();
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as InstagramConnection;
    if (!parsed?.accessToken || !parsed?.instagramUserId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveInstagramConnection(connection: InstagramConnection): Promise<void> {
  const path = getFilePath();
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(connection, null, 2), "utf-8");
  await rename(tmp, path);
}
