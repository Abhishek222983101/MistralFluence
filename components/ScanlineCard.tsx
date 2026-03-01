import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ScanlineCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  selected?: boolean;
  accent?: "red" | "cyan" | "gold" | "magenta";
  onClick?: () => void;
}

export default function ScanlineCard({
  title,
  description,
  icon,
  selected,
  accent = "red",
  onClick,
}: ScanlineCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("scanline-card", { selected })}
      data-accent={accent}
    >
      <div className="scanline-card-icon">{icon}</div>
      <div>
        <p className="scanline-card-title">{title}</p>
        <p className="scanline-card-desc">{description}</p>
      </div>
    </button>
  );
}
