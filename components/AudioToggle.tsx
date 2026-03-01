"use client";

interface AudioToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export default function AudioToggle({ enabled, onToggle }: AudioToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="audio-toggle"
      aria-pressed={enabled}
    >
      <span className="audio-dot" aria-hidden="true" />
      <span className="text-xs uppercase tracking-[0.32em]">
        Audio {enabled ? "On" : "Off"}
      </span>
    </button>
  );
}
