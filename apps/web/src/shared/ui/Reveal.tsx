import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "./utils/cn";

interface RevealProps {
  children: ReactNode;
  /** Atraso em ms — usado para escalonar itens de uma mesma lista. */
  delay?: number;
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Revela o conteúdo quando ele entra na viewport (fade + 12px de subida).
 * Propósito: dar ritmo de leitura à página institucional — o olho chega na seção
 * e ela "assenta". Não é decoração: cada bloco entra uma única vez.
 *
 * `prefers-reduced-motion` desliga o efeito por completo (não só encurta a duração):
 * o conteúdo já monta visível e nenhum observer é criado.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      style={visible && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out-soft motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
