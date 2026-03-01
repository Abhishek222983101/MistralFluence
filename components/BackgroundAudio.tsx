"use client";

import { useEffect, useRef } from "react";

const AUDIO_SRC =
  "https://opengameart.org/sites/default/files/space_graveyard_4.mp3";

interface BackgroundAudioProps {
  enabled: boolean;
}

export default function BackgroundAudio({ enabled }: BackgroundAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.32;

    const attemptPlay = () => {
      const attempt = audio.play();
      if (attempt) {
        attempt
          .then(() => {
            startedRef.current = true;
          })
          .catch(() => undefined);
      }
    };

    const handleUserGesture = () => {
      attemptPlay();
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    };

    if (enabled) {
      if (!startedRef.current) {
        attemptPlay();
        window.addEventListener("pointerdown", handleUserGesture, { once: true });
        window.addEventListener("keydown", handleUserGesture, { once: true });
      }
    } else {
      audio.pause();
      startedRef.current = false;
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    }

    return () => {
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    };
  }, [enabled]);

  return (
    <audio
      ref={audioRef}
      src={AUDIO_SRC}
      autoPlay
      loop
      preload="auto"
      playsInline
      aria-hidden="true"
    />
  );
}
