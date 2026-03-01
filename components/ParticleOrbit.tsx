"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface ParticleOrbitProps {
  className?: string;
  count?: number;
  radius?: number;
}

export default function ParticleOrbit({
  className,
  count = 42,
  radius = 110,
}: ParticleOrbitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    const particles = Array.from({ length: count }, (_, index) => ({
      angle: (Math.PI * 2 * index) / count,
      speed: 0.003 + Math.random() * 0.004,
      distance: radius + Math.random() * 45,
      size: 1.6 + Math.random() * 2.4,
      hue: index % 3 === 0 ? "#ff4500" : index % 3 === 1 ? "#ff8c00" : "#00f0ff",
    }));

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);

      for (const particle of particles) {
        particle.angle += particle.speed;
        const x = Math.cos(particle.angle) * particle.distance;
        const y = Math.sin(particle.angle) * particle.distance;
        ctx.beginPath();
        ctx.fillStyle = particle.hue;
        ctx.shadowBlur = 18;
        ctx.shadowColor = particle.hue;
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [count, radius]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("particle-orbit", className)}
      aria-hidden="true"
    />
  );
}
