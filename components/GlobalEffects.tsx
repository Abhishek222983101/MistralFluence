"use client";

import AudioToggle from "@/components/AudioToggle";
import BackgroundAudio from "@/components/BackgroundAudio";
import CustomCursor from "@/components/CustomCursor";
import { useSound } from "@/hooks/useSound";

export default function GlobalEffects() {
  const { enabled, toggle } = useSound();

  return (
    <>
      <BackgroundAudio enabled={enabled} />
      <CustomCursor />
      <AudioToggle enabled={enabled} onToggle={toggle} />
    </>
  );
}
