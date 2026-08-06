import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "./utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        // biome-ignore lint/a11y/useSemanticElements: <dialog> exige showModal()/imperative API incompatível com o padrão controlado open/onClose deste componente
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-elevated",
          "focus:outline-none",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <X className="h-4 w-4" />
        </button>
        {title && (
          <h2 id="modal-title" className="mb-1 pr-8 text-xl font-semibold text-navy">
            {title}
          </h2>
        )}
        {description && <p className="mb-4 text-sm text-ink-soft">{description}</p>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
