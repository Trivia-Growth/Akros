interface PlaceholderProps {
  title: string;
  story: string;
}

export function Placeholder({ title, story }: PlaceholderProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-white/50 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-navy">{title}</h1>
      <p className="text-sm text-ink-muted">
        Conteúdo desta página chega em <code className="text-gold-700">{story}</code>.
      </p>
    </div>
  );
}
