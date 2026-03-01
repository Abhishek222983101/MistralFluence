"use client";

import { useCallback, useEffect, useState } from "react";

type SoundName = "click" | "hover" | "success" | "transition";

const SOUND_MAP: Record<SoundName, string> = {
  click: "/sounds/click.mp3",
  hover: "/sounds/hover.mp3",
  success: "/sounds/success.mp3",
  transition: "/sounds/transition.mp3",
};

export function useSound() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("mf_audio");
    if (stored === null) {
      window.localStorage.setItem("mf_audio", "on");
      setEnabled(true);
      return;
    }
    setEnabled(stored === "on");
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mf_audio", next ? "on" : "off");
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled || typeof Audio === "undefined") return;
      const src = SOUND_MAP[name];
      if (!src) return;
      try {
        const audio = new Audio(src);
        audio.volume = 0.3;
        audio.play().catch(() => undefined);
      } catch {
        // Audio is optional; ignore failures until assets are added.
      }
    },
    [enabled]
  );

  return { enabled, toggle, play };
}
