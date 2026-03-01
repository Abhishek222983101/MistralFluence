import { cn } from "@/lib/cn";

interface StatWidgetProps {
  label: string;
  value: string;
  caption?: string;
  className?: string;
}

export default function StatWidget({ label, value, caption, className }: StatWidgetProps) {
  return (
    <div className={cn("stat-widget", className)}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {caption ? <p className="stat-caption">{caption}</p> : null}
    </div>
  );
}
