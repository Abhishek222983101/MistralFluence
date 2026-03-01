"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface HolographicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}

export default function HolographicButton({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: HolographicButtonProps) {
  const { type, ...rest } = props;
  return (
    <button
      className={cn("holo-btn", `holo-btn-${size}`, className)}
      data-variant={variant}
      type={type ?? "button"}
      {...rest}
    >
      {icon ? <span className="holo-btn-icon">{icon}</span> : null}
      <span className="holo-btn-text">{children}</span>
    </button>
  );
}
