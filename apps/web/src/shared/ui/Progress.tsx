import { cn } from "./utils/cn";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
}

export function Progress({ value, max = 100, className, label }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs text-ink-soft">
          <span>{label}</span>
          <span className="font-medium text-navy">{Math.round(pct)}%</span>
        </div>
      )}
      <progress
        value={pct}
        max={100}
        className={cn(
          "h-2 w-full appearance-none overflow-hidden rounded-full",
          "[&::-webkit-progress-bar]:bg-cream-300 [&::-webkit-progress-value]:rounded-full",
          "[&::-webkit-progress-value]:bg-gradient-to-r [&::-webkit-progress-value]:from-gold-500 [&::-webkit-progress-value]:to-gold-600",
          "[&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-gold-500",
        )}
      >
        {Math.round(pct)}%
      </progress>
    </div>
  );
}
