"use client";

import { cn } from "@/lib/cn";

interface NeuralBackgroundProps {
  className?: string;
  density?: number;
  speed?: number;
}

export default function NeuralBackground({
  className,
  density = 90,
  speed = 0.05,
}: NeuralBackgroundProps) {
  const animationDuration = `${Math.max(8, Math.floor(24 - speed * 120))}s`;
  const pulseOpacity = Math.min(0.85, Math.max(0.35, density / 160));

  return (
    <div className={cn("neural-wrap", className)} aria-hidden="true">
      <div className="neural-fallback" />
      <div
        className="neural-fallback neural-fallback-pulse"
        style={{ animationDuration, opacity: pulseOpacity }}
      />
    </div>
  );
}
