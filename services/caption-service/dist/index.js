import express from "express";
import { captionVideo, SERVE_DIR } from "./caption.js";
const app = express();
app.use(express.json());
// Serve captioned videos as static files
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
    }
    catch (err) {
        console.error("[caption] Error:", err.message);
        res.status(500).json({ error: err.message });
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
