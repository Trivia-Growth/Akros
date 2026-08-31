import { Check, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./utils/cn";

export type StepStatus = "concluida" | "em_andamento" | "liberada" | "bloqueada";

export interface StepperItem {
  id: string;
  title: string;
  status: StepStatus;
}

interface StepperProps {
  items: StepperItem[];
  orientation?: "horizontal" | "vertical";
  onSelect?: (id: string) => void;
  renderExtra?: (item: StepperItem) => ReactNode;
  className?: string;
}

const nodeClasses: Record<StepStatus, string> = {
  concluida: "bg-navy text-white border-navy",
  em_andamento: "bg-gold text-navy border-gold shadow-gold",
  liberada: "bg-white text-navy border-navy",
  bloqueada: "bg-cream-300 text-ink-muted border-border",
};

const labelClasses: Record<StepStatus, string> = {
  concluida: "text-navy font-medium",
  em_andamento: "text-navy font-semibold",
  liberada: "text-ink",
  bloqueada: "text-ink-muted",
};

export function Stepper({
  items,
  orientation = "horizontal",
  onSelect,
  renderExtra,
  className,
}: StepperProps) {
  const isVertical = orientation === "vertical";
  return (
    <div className={cn("flex", isVertical ? "flex-col" : "items-start", className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const clickable = onSelect && item.status !== "bloqueada";
        return (
          <div
            key={item.id}
            className={cn(
              "relative flex",
              isVertical ? "flex-row gap-4 pb-8 last:pb-0" : "flex-1 flex-col items-center gap-2",
            )}
          >
            {!isLast && (
              <div
                aria-hidden
                className={cn(
                  isVertical
                    ? "absolute left-[15px] top-8 h-full w-px bg-border"
                    : "absolute left-1/2 top-4 h-px w-full bg-border",
                  item.status === "concluida" && "bg-navy",
                )}
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect?.(item.id)}
              // Nas etapas concluída/bloqueada o conteúdo é só um ícone `aria-hidden`, então o
              // botão ficava sem nome acessível — leitor de tela anunciava "botão" e mais nada
              // (axe `button-name`, impacto crítico). O título já está visível ao lado; aqui ele
              // vira o nome do controle.
              aria-label={item.title}
              aria-current={item.status === "em_andamento" ? "step" : undefined}
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-200",
                clickable && "cursor-pointer hover:brightness-95",
                !clickable && "cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                nodeClasses[item.status],
              )}
            >
              {item.status === "concluida" && <Check className="h-4 w-4" aria-hidden />}
              {item.status === "bloqueada" && <Lock className="h-3.5 w-3.5" aria-hidden />}
              {(item.status === "liberada" || item.status === "em_andamento") && (
                <span>{idx + 1}</span>
              )}
            </button>
            <div className={cn(isVertical ? "flex-1 pt-1" : "text-center")}>
              <p className={cn("text-sm", labelClasses[item.status])}>{item.title}</p>
              {renderExtra?.(item)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
