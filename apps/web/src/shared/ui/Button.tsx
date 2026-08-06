import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-navy text-white hover:bg-navy-700 active:bg-navy-800 disabled:bg-navy-200 shadow-subtle",
  secondary:
    "bg-white text-navy border border-border hover:bg-cream-200 active:bg-cream-300 disabled:text-ink-muted",
  ghost: "bg-transparent text-navy hover:bg-navy-50 active:bg-navy-100 disabled:text-ink-muted",
  gold: "bg-gold text-navy hover:bg-gold-600 active:bg-gold-700 shadow-gold disabled:bg-gold-100",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-200",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium tracking-tight",
          "transition-colors duration-200 ease-out-soft",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
