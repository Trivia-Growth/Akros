import { type ReactNode, useId, useState } from "react";
import { cn } from "./utils/cn";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      {visible && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy-950 px-2.5 py-1.5 text-xs text-white shadow-elevated",
            "transition-opacity duration-150",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
