import { cn } from "@/lib/cn";

interface StepperProps {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
}

export default function Stepper({ current, total, labels, className }: StepperProps) {
  return (
    <div className={cn("stepper", className)}>
      <div className="stepper-track" aria-hidden="true">
        <div
          className="stepper-progress"
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
        />
      </div>
      <div className="stepper-nodes">
        {Array.from({ length: total }).map((_, index) => {
          const stepNumber = index + 1;
          const active = stepNumber === current;
          const complete = stepNumber < current;
          return (
            <div
              key={`step-${stepNumber}`}
              className={cn("stepper-node", {
                active,
                complete,
              })}
            >
              <span className="stepper-dot" />
              {labels?.[index] ? (
                <span className="stepper-label">{labels[index]}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
