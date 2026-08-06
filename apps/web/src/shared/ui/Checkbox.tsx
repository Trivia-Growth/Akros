import { Check } from "lucide-react";
import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "./utils/cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={checkboxId} className="flex cursor-pointer items-start gap-2.5">
          <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              aria-invalid={!!error}
              className={cn(
                "peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded border border-border bg-white",
                "checked:border-navy checked:bg-navy",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                error && "border-red-400",
                className,
              )}
              {...props}
            />
            <Check
              className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100"
              aria-hidden
            />
          </span>
          <span className="text-sm text-ink-soft">{label}</span>
        </label>
        {error && <p className="pl-7 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";
