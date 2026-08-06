import { useDemoSession } from "@/features/demo/application/useDemoSession";
import { cenarios } from "@/mocks/scenarios";
import { useMockDb } from "@/mocks/store";
import { isDemoMode } from "@/shared/lib/env";
import { toast } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { RotateCcw, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DemoBar() {
  const navigate = useNavigate();
  const clientes = useMockDb((s) => s.clientes);
  const carregarCenario = useMockDb((s) => s.carregarCenario);
  const personaId = useDemoSession((s) => s.personaId);
  const papel = useDemoSession((s) => s.papel);
  const cenarioAtivo = useDemoSession((s) => s.cenarioAtivo);
  const setPersona = useDemoSession((s) => s.setPersona);
  const setPapel = useDemoSession((s) => s.setPapel);
  const setCenario = useDemoSession((s) => s.setCenario);
  const resetarDemo = useMockDb((s) => s.resetarDemo);

  if (!isDemoMode) return null;

  const personaAtiva = clientes.find((c) => c.id === personaId);

  function irParaPortal() {
    setPapel("cliente");
    navigate("/portal");
  }

  function irParaAdmin() {
    setPapel("admin");
    navigate("/admin");
  }

  function handleReset() {
    resetarDemo();
    setCenario("padrao");
    toast.success("Demo resetada para o estado inicial.");
  }

  function handleCenario(id: string) {
    const cenario = cenarios.find((c) => c.id === id);
    if (!cenario) return;

    carregarCenario(cenario.seedExtra ?? (() => ({})));
    setCenario(cenario.id);
    setPapel(cenario.papel);
    if (cenario.personaId) setPersona(cenario.personaId);

    navigate(cenario.papel === "admin" ? "/admin" : "/portal");
    toast.success(`Cenário "${cenario.nome}" carregado.`);
  }

  return (
    <div className="sticky bottom-0 z-40 border-t border-gold-700/30 bg-navy-950 px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium uppercase tracking-label text-gold">
          <UserCog className="h-3.5 w-3.5" aria-hidden />
          Modo demo
        </span>

        <label className="flex items-center gap-1.5">
          <span className="text-white/50">Persona:</span>
          <select
            value={personaId}
            onChange={(e) => setPersona(e.target.value)}
            className="rounded border border-white/20 bg-navy-900 px-2 py-1 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} — {c.tipoVisto}
              </option>
            ))}
          </select>
        </label>

        {personaAtiva && (
          <span className="hidden text-white/40 sm:inline">
            impersonando <strong className="text-white/70">{personaAtiva.nome}</strong>
          </span>
        )}

        <label className="hidden items-center gap-1.5 md:flex">
          <span className="text-white/50">Cenário:</span>
          <select
            value={cenarioAtivo}
            onChange={(e) => handleCenario(e.target.value)}
            title="Carrega um preset de dados para a apresentação"
            className="rounded border border-white/20 bg-navy-900 px-2 py-1 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {cenarios.map((c) => (
              <option key={c.id} value={c.id} title={c.descricao}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={irParaPortal}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors",
              papel === "cliente"
                ? "bg-gold text-navy"
                : "bg-white/10 text-white/70 hover:bg-white/20",
            )}
          >
            Ver como Cliente
          </button>
          <button
            type="button"
            onClick={irParaAdmin}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors",
              papel === "admin"
                ? "bg-gold text-navy"
                : "bg-white/10 text-white/70 hover:bg-white/20",
            )}
          >
            Ver como Admin
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 rounded px-2.5 py-1 font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Resetar demo
          </button>
        </div>
      </div>
    </div>
  );
}
