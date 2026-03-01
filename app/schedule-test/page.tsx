"use client";

import { useState } from "react";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

type ScheduledPost = {
  id: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  scheduledFor: string;
  status: string;
  publishedAt?: string;
  reelUrl?: string;
  error?: string;
  createdAt: string;
};

export default function ScheduleTestPage() {
  const [videoUrl, setVideoUrl] = useState("https://storage.theapi.app/videos/303466910530022.mp4");
  const [caption, setCaption] = useState("Test post from Moltfluence scheduling system");
  const [hashtags, setHashtags] = useState("monadfluence,ai,test");
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const schedulePost = async () => {
    setLoading("Scheduling post...");
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/x402/schedule-reel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          caption,
          hashtags: hashtags.split(",").map((t) => t.trim()).filter(Boolean),
          scheduledFor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");
      setMessage({ type: "success", text: `Scheduled! ID: ${data.scheduledPost.id}` });
      await loadPosts();
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const loadPosts = async () => {
    setLoading("Loading posts...");
    try {
      const res = await fetch(`${API_BASE}/api/x402/schedule-reel`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const deletePost = async (id: string) => {
    setLoading("Deleting...");
    try {
      const res = await fetch(`${API_BASE}/api/x402/schedule-reel?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: "success", text: "Deleted!" });
      await loadPosts();
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const triggerCron = async () => {
    setLoading("Running cron job...");
    setMessage(null);
    try {
      const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || "test";
      const res = await fetch(`${API_BASE}/api/cron/publish-scheduled?secret=${cronSecret}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: "success", text: `Cron complete! Processed: ${data.processed}` });
      await loadPosts();
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setLoading(null);
    }
  };

  const setQuickSchedule = (minutes: number) => {
    const date = new Date(Date.now() + minutes * 60 * 1000);
    setScheduledFor(date.toISOString().slice(0, 16));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Instagram Scheduler Test</h1>
      <p style={styles.subtitle}>Test scheduling without real Instagram (Dry Run Mode)</p>

      {message && (
        <div style={{
          ...styles.card,
          background: message.type === "success" ? "#0a3a0a" : "#3a0a0a",
          borderColor: message.type === "success" ? "#0f0" : "#f00",
        }}>
          {message.text}
        </div>
      )}

      {loading && <div style={styles.loading}>{loading}</div>}

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Schedule New Post</h2>

        <label style={styles.label}>Video URL</label>
        <input
          style={styles.input}
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://..."
        />

        <label style={styles.label}>Caption</label>
        <textarea
          style={styles.textarea}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
        />

        <label style={styles.label}>Hashtags (comma-separated)</label>
        <input
          style={styles.input}
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="tag1,tag2,tag3"
        />

        <label style={styles.label}>Scheduled For</label>
        <input
          style={styles.input}
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
        />
        <div style={styles.buttonRow}>
          <button style={styles.smallBtn} onClick={() => setQuickSchedule(1)}>+1 min</button>
          <button style={styles.smallBtn} onClick={() => setQuickSchedule(5)}>+5 min</button>
          <button style={styles.smallBtn} onClick={() => setQuickSchedule(30)}>+30 min</button>
          <button style={styles.smallBtn} onClick={() => setQuickSchedule(60)}>+1 hour</button>
        </div>

        <button
          style={styles.primaryBtn}
          onClick={schedulePost}
          disabled={!videoUrl || !scheduledFor || loading !== null}
        >
          Schedule Post
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.row}>
          <h2 style={styles.cardTitle}>Scheduled Posts</h2>
          <button style={styles.secondaryBtn} onClick={loadPosts}>Refresh</button>
        </div>

        {posts.length === 0 ? (
          <p style={styles.emptyText}>No scheduled posts. Create one above.</p>
        ) : (
          <div style={styles.postList}>
            {posts.map((post) => (
              <div key={post.id} style={styles.postItem}>
                <div style={styles.postHeader}>
                  <span style={{
                    ...styles.statusBadge,
                    background: post.status === "published" ? "#0a0" :
                               post.status === "failed" ? "#a00" :
                               post.status === "processing" ? "#aa0" : "#666"
                  }}>
                    {post.status}
                  </span>
                  <span style={styles.postId}>{post.id}</span>
                </div>
                <div style={styles.postDetail}>
                  <strong>Scheduled:</strong> {new Date(post.scheduledFor).toLocaleString()}
                </div>
                <div style={styles.postDetail}>
                  <strong>Video:</strong> {post.videoUrl.slice(0, 50)}...
                </div>
                {post.reelUrl && (
                  <div style={styles.postDetail}>
                    <strong>Reel:</strong>{" "}
                    <a href={post.reelUrl} target="_blank" rel="noopener" style={styles.link}>
                      {post.reelUrl}
                    </a>
                  </div>
                )}
                {post.error && (
                  <div style={{ ...styles.postDetail, color: "#f66" }}>
                    <strong>Error:</strong> {post.error}
                  </div>
                )}
                {post.status === "pending" && (
                  <button
                    style={styles.deleteBtn}
                    onClick={() => deletePost(post.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Manual Cron Trigger</h2>
        <p style={styles.hint}>
          Manually trigger the cron job to process due posts.
          In production, this runs automatically every 5 minutes.
        </p>
        <button style={styles.secondaryBtn} onClick={triggerCron}>
          Run Cron Now
        </button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Dry Run Mode</h2>
        <p style={styles.hint}>
          Set <code style={styles.code}>INSTAGRAM_DRY_RUN=true</code> in Vercel env vars
          to test without real Instagram uploads. Posts will be marked as "published"
          with fake reel URLs.
        </p>
        <p style={styles.hint}>
          Current mode: <span style={styles.code}>
            {typeof window !== "undefined" ? "Check server env" : "unknown"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "system-ui, sans-serif",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#fff",
  },
  title: {
    textAlign: "center",
    color: "#e04d52",
    marginBottom: "5px",
  },
  subtitle: {
    textAlign: "center",
    color: "#4ade80",
    marginBottom: "20px",
    fontSize: "14px",
  },
  card: {
    padding: "20px",
    background: "#161616",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid #333",
  },
  cardTitle: {
    margin: "0 0 15px 0",
    fontSize: "18px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    color: "#888",
    marginBottom: "5px",
    marginTop: "10px",
  },
  input: {
    width: "100%",
    padding: "10px",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    resize: "vertical",
    boxSizing: "border-box",
  },
  buttonRow: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
    marginBottom: "15px",
  },
  smallBtn: {
    padding: "6px 12px",
    background: "#333",
    border: "none",
    borderRadius: "4px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
  },
  primaryBtn: {
    width: "100%",
    padding: "12px",
    background: "#e04d52",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },
  secondaryBtn: {
    padding: "8px 16px",
    background: "#333",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
  },
  deleteBtn: {
    marginTop: "10px",
    padding: "6px 12px",
    background: "#a00",
    border: "none",
    borderRadius: "4px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loading: {
    padding: "12px",
    background: "#1a1a1a",
    borderRadius: "8px",
    textAlign: "center",
    color: "#888",
    marginBottom: "15px",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    padding: "20px",
  },
  postList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  postItem: {
    padding: "12px",
    background: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #222",
  },
  postHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  statusBadge: {
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  postId: {
    color: "#666",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  postDetail: {
    fontSize: "13px",
    color: "#aaa",
    marginBottom: "4px",
  },
  link: {
    color: "#4ade80",
    wordBreak: "break-all",
  },
  hint: {
    fontSize: "13px",
    color: "#888",
    marginBottom: "10px",
  },
  code: {
    background: "#333",
    padding: "2px 6px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
  },
};
