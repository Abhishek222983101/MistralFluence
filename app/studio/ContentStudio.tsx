"use client";

import { useState } from "react";
import VideoGenerator from "./VideoGenerator";
import ReelPublisher from "./ReelPublisher";

export default function ContentStudio() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <VideoGenerator onVideoReady={setVideoUrl} />
      <ReelPublisher videoUrl={videoUrl} />
    </div>
  );
}
