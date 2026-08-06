import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "./utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            className={cn(
              "h-11 w-full appearance-none rounded-md border border-border bg-white px-3.5 pr-10 text-sm text-ink",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:border-gold",
              "disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-ink-muted",
              error && "border-red-400 focus-visible:ring-red-300",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {!error && hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
