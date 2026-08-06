import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  createContext,
  useContext,
  useState,
} from "react";
import { cn } from "./utils/cn";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* deve ser usado dentro de <Tabs>");
  return ctx;
}

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-white p-1",
        className,
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { value: current, setValue } = useTabsContext();
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => setValue(value)}
      className={cn(
        "rounded-[6px] px-4 py-2 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        active ? "bg-navy text-white" : "text-ink-soft hover:bg-cream-200",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: current } = useTabsContext();
  if (current !== value) return null;
  return (
    <div role="tabpanel" className={cn("mt-4", className)} {...props}>
      {children}
    </div>
  );
}
