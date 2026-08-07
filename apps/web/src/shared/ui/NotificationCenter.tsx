import { Bell, CheckCheck, ChevronRight, Circle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "./utils/cn";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tone?: "gold" | "navy" | "danger";
}

interface NotificationCenterProps {
  items: NotificationItem[];
  label?: string;
}

const dotClasses = {
  gold: "bg-gold",
  navy: "bg-navy",
  danger: "bg-red-500",
};

/** Caixa de entrada curta para ações relevantes, sem disputar espaço com a tela de trabalho. */
export function NotificationCenter({ items, label = "Notificações" }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !readIds.includes(item.id));

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`${label}${unread.length ? `, ${unread.length} pendentes` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-navy transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <section className="absolute right-0 z-40 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white shadow-elevated">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-navy">{label}</p>
              <p className="text-xs text-ink-muted">
                {unread.length
                  ? `${unread.length} item${unread.length > 1 ? "ns" : ""} para você`
                  : "Tudo em dia por aqui"}
              </p>
            </div>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => setReadIds(items.map((item) => item.id))}
                className="flex items-center gap-1 text-xs font-medium text-gold-700 hover:text-navy"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                Ler tudo
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-muted">
                Nenhuma atualização agora.
              </p>
            ) : (
              items.map((item) => {
                const isRead = readIds.includes(item.id);
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => {
                      setReadIds((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]));
                      setOpen(false);
                    }}
                    className="group flex gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-cream-200"
                  >
                    <Circle
                      className={cn(
                        "mt-1 h-2.5 w-2.5 shrink-0 fill-current",
                        isRead ? "text-border" : dotClasses[item.tone ?? "navy"],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-navy">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight
                      className="mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-gold-700"
                      aria-hidden
                    />
                  </Link>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
