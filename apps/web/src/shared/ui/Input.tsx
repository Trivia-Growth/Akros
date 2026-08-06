import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "./utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "h-11 rounded-md border border-border bg-white px-3.5 text-sm text-ink",
            "placeholder:text-ink-muted",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:border-gold",
            "disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-ink-muted",
            error && "border-red-400 focus-visible:ring-red-300",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-ink-muted">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
