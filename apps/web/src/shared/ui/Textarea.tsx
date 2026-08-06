import { type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "./utils/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          className={cn(
            "resize-y rounded-md border border-border bg-white px-3.5 py-2.5 text-sm text-ink",
            "placeholder:text-ink-muted",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:border-gold",
            "disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-ink-muted",
            error && "border-red-400 focus-visible:ring-red-300",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {!error && hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
