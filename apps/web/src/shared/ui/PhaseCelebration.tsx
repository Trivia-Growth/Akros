import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./Button";

interface PhaseCelebrationProps {
  phaseTitle: string;
  onClose: () => void;
}

/** Celebra avanço real sem desbloquear fases que ainda dependem da operação Akros. */
export function PhaseCelebration({ phaseTitle, onClose }: PhaseCelebrationProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-navy-950/80 p-6 backdrop-blur-sm">
      <div
        aria-hidden
        className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-gold/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-navy-300/25 blur-3xl"
      />
      <section className="phase-celebration relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/30 bg-white p-8 text-center shadow-2xl sm:p-10">
        <div aria-hidden className="phase-confetti phase-confetti-left" />
        <div aria-hidden className="phase-confetti phase-confetti-right" />
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-gold-700 ring-8 ring-gold-50/70">
          <Sparkles className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-label text-gold-700">
          Etapa concluída
        </p>
        <h2 className="mt-3 font-display text-3xl font-medium leading-tight text-navy">
          Você avançou em sua jornada.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          A fase <strong className="font-medium text-navy">{phaseTitle}</strong> foi concluída.
          Nossa equipe foi avisada e prepara seu próximo passo.
        </p>
        <Button onClick={onClose} className="mt-7">
          Continuar acompanhando
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </section>
    </div>
  );
}
