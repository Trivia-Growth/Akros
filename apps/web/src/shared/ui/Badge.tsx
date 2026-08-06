import type { HTMLAttributes } from "react";
import { cn } from "./utils/cn";

type Variant = "neutral" | "gold" | "success" | "warning" | "danger" | "navy";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  neutral: "bg-cream-300 text-ink-soft",
  gold: "bg-gold-50 text-gold-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  navy: "bg-navy-50 text-navy-700",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
