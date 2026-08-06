import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { create } from "zustand";
import { cn } from "./utils/cn";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, variant = "info") => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, variant: ToastVariant = "info") {
  useToastStore.getState().push(message, variant);
}
toast.success = (message: string) => toast(message, "success");
toast.error = (message: string) => toast(message, "error");
toast.info = (message: string) => toast(message, "info");

const icons: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-navy-100 bg-navy-50 text-navy-800",
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const Icon = icons[t.variant];
        return (
          <output
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-md border px-4 py-3 text-sm shadow-elevated",
              "min-w-[280px] max-w-sm",
              variantClasses[t.variant],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p className="flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar notificação"
              className="rounded p-0.5 opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </output>
        );
      })}
    </div>
  );
}
