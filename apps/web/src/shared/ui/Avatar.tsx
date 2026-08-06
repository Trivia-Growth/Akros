import type { HTMLAttributes } from "react";
import { cn } from "./utils/cn";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = "md", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-100 font-medium text-navy-700",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
