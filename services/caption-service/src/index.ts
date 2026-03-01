import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { captionVideo, SERVE_DIR } from "./caption.js";

const app = express();
app.use(express.json());

// Serve generated videos as static files
app.use("/captioned", express.static(SERVE_DIR));

const SECRET = process.env.CAPTION_SERVICE_SECRET ?? "";

app.post("/caption", async (req, res) => {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!SECRET || auth !== SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { videoUrl, style } = req.body ?? {};
  if (!videoUrl || typeof videoUrl !== "string") {
    res.status(400).json({ error: "videoUrl is required" });
    return;
  }

  try {
    const result = await captionVideo(videoUrl, style ?? "tiktok-highlight");
    res.json(result);
  } catch (err) {
    console.error("[caption] Error:", (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Upload raw MP4 bytes (from LTX-2 synchronous response) and store on VPS
app.post("/upload-video", express.raw({ type: "video/mp4", limit: "200mb" }), async (req, res) => {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!SECRET || auth !== SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: "Empty or invalid video body" });
    return;
  }

  try {
    fs.mkdirSync(SERVE_DIR, { recursive: true });
    const jobId = crypto.randomUUID().slice(0, 12);
    const filename = `${jobId}.mp4`;
    const filepath = path.join(SERVE_DIR, filename);
    fs.writeFileSync(filepath, req.body);

    const publicUrl = (process.env.PUBLIC_URL ?? "").replace(/\/+$/, "");
    const url = `${publicUrl}/captioned/${filename}`;
    res.json({ url, jobId });
  } catch (err) {
    console.error("[upload-video] Error:", (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = parseInt(process.env.PORT ?? "3100", 10);
app.listen(PORT, () => {
  console.log(`Caption service listening on :${PORT}`);
  console.log(`Serving videos from: ${SERVE_DIR}`);
});
