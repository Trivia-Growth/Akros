import { useMockDb } from "@/mocks/store";
import { Badge, Button, Card, Input, Modal, Select, Textarea, toast } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import { Copy, FileText, Layers3, PencilLine, Plus, Route, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { EtapaTemplate, FaseTemplate, Programa, ResponsavelEtapa } from "../domain/types";

const RESPONSAVEIS: ResponsavelEtapa[] = ["cliente", "akros", "terceiro", "uscis"];

export function ProgramasPage() {
  const programas = useMockDb((state) => state.programas);
  const clientes = useMockDb((state) => state.clientes);
  const duplicarPrograma = useMockDb((state) => state.duplicarPrograma);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(programas[0]?.id ?? null);
  const [editorOpen, setEditorOpen] = useState(false);

  const selecionado = programas.find((programa) => programa.id === selecionadoId) ?? programas[0];
  const clientesPorPrograma = useMemo(() => {
    const contagem: Record<string, number> = {};
    for (const cliente of clientes) {
      if (cliente.programaId)
        contagem[cliente.programaId] = (contagem[cliente.programaId] ?? 0) + 1;
    }
    return contagem;
  }, [clientes]);

  function handleDuplicar() {
    if (!selecionado) return;
    const copia = duplicarPrograma(selecionado.id);
    if (!copia) return;
    setSelecionadoId(copia.id);
    setEditorOpen(true);
    toast.success("Programa duplicado. Ajuste a nova versão antes de ativá-la.");
  }

  if (!selecionado) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
            Configuração da operação
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
            Programas e jornadas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Modele a experiência de cada visto sem depender de deploy. Alterações passam a valer
            para novos casos; jornadas em andamento mantêm seu histórico.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDuplicar}>
            <Copy className="h-4 w-4" aria-hidden />
            Duplicar programa
          </Button>
          <Button onClick={() => setEditorOpen(true)}>
            <PencilLine className="h-4 w-4" aria-hidden />
            Editar jornada
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-white p-3 shadow-subtle">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-label text-ink-muted">
            Catálogo
          </p>
          <div className="flex flex-col gap-1">
            {programas.map((programa) => {
              const ativo = programa.id === selecionado.id;
              return (
                <button
                  key={programa.id}
                  type="button"
                  onClick={() => setSelecionadoId(programa.id)}
                  className={cn(
                    "rounded-lg p-3 text-left transition",
                    ativo ? "bg-navy text-white shadow-subtle" : "text-ink-soft hover:bg-cream-100",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{programa.nome}</p>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        programa.ativo ? "bg-emerald-400" : "bg-slate-300",
                      )}
                    />
                  </div>
                  <p className={cn("mt-1 text-xs", ativo ? "text-slate-300" : "text-ink-muted")}>
                    v{programa.versao} · {programa.fasesTemplate.length} fases
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="grid gap-4 rounded-xl bg-navy p-5 text-white shadow-elevated sm:grid-cols-3">
            <ProgramMetric
              icon={Route}
              value={selecionado.fasesTemplate.length}
              label="fases na jornada"
            />
            <ProgramMetric
              icon={Layers3}
              value={selecionado.fasesTemplate.reduce(
                (total, fase) => total + fase.etapas.length,
                0,
              )}
              label="etapas configuradas"
            />
            <ProgramMetric
              icon={UserRound}
              value={clientesPorPrograma[selecionado.codigo] ?? 0}
              label="casos nesta versão"
            />
          </section>

          <Card className="p-0">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-semibold text-navy">
                    {selecionado.nome}
                  </h2>
                  <Badge variant={selecionado.ativo ? "success" : "neutral"}>
                    {selecionado.ativo ? "Ativo" : "Rascunho"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Código: {selecionado.codigo} · versão {selecionado.versao}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="text-sm font-medium text-gold-700 hover:text-gold-800"
              >
                Ajustar estrutura
              </button>
            </div>
            <ol className="divide-y divide-border">
              {selecionado.fasesTemplate.map((fase) => (
                <li key={fase.id} className="p-5">
                  <div className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-800">
                      {fase.ordem + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy">{fase.titulo}</p>
                      <p className="mt-1 text-sm text-ink-soft">{fase.descricao}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {fase.etapas.map((etapa) => (
                          <span
                            key={etapa.id}
                            className="rounded-md border border-border bg-cream-50 px-2.5 py-1.5 text-xs text-ink-soft"
                          >
                            <span className="mr-1.5 font-semibold text-navy">{etapa.titulo}</span>
                            <span className="text-ink-muted">· {etapa.responsavel}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="flex items-center gap-3 border-gold-200 bg-gold-50/45">
            <FileText className="h-5 w-5 shrink-0 text-gold-700" aria-hidden />
            <p className="text-sm text-ink-soft">
              Documentos exigidos permanecem vinculados ao programa. Na próxima evolução, eles
              ganham o mesmo editor visual das etapas.
            </p>
          </Card>
        </div>
      </div>

      {editorOpen && <ProgramaEditor programa={selecionado} onClose={() => setEditorOpen(false)} />}
    </div>
  );
}

function ProgramaEditor({ programa, onClose }: { programa: Programa; onClose: () => void }) {
  const salvarPrograma = useMockDb((state) => state.salvarPrograma);
  const [draft, setDraft] = useState<Programa>(() => structuredClone(programa));

  function atualizarFase(indice: number, patch: Partial<FaseTemplate>) {
    setDraft((atual) => ({
      ...atual,
      fasesTemplate: atual.fasesTemplate.map((fase, index) =>
        index === indice ? { ...fase, ...patch } : fase,
      ),
    }));
  }

  function atualizarEtapa(faseIndex: number, etapaIndex: number, patch: Partial<EtapaTemplate>) {
    setDraft((atual) => ({
      ...atual,
      fasesTemplate: atual.fasesTemplate.map((fase, index) =>
        index !== faseIndex
          ? fase
          : {
              ...fase,
              etapas: fase.etapas.map((etapa, stepIndex) =>
                stepIndex === etapaIndex ? { ...etapa, ...patch } : etapa,
              ),
            },
      ),
    }));
  }

  function adicionarFase() {
    setDraft((atual) => ({
      ...atual,
      fasesTemplate: [
        ...atual.fasesTemplate,
        {
          id: `fase-${crypto.randomUUID().slice(0, 6)}`,
          ordem: atual.fasesTemplate.length,
          titulo: "Nova fase",
          descricao: "Descreva o objetivo desta fase.",
          etapas: [],
        },
      ],
    }));
  }

  function adicionarEtapa(faseIndex: number) {
    setDraft((atual) => ({
      ...atual,
      fasesTemplate: atual.fasesTemplate.map((fase, index) =>
        index !== faseIndex
          ? fase
          : {
              ...fase,
              etapas: [
                ...fase.etapas,
                {
                  id: `etapa-${crypto.randomUUID().slice(0, 6)}`,
                  titulo: "Nova etapa",
                  descricao: "Defina a ação esperada.",
                  responsavel: "cliente",
                },
              ],
            },
      ),
    }));
  }

  function removerFase(indice: number) {
    setDraft((atual) => ({
      ...atual,
      fasesTemplate: atual.fasesTemplate
        .filter((_, index) => index !== indice)
        .map((fase, index) => ({ ...fase, ordem: index })),
    }));
  }

  function removerEtapa(faseIndex: number, etapaIndex: number) {
    setDraft((atual) => ({
      ...atual,
      fasesTemplate: atual.fasesTemplate.map((fase, index) =>
        index !== faseIndex
          ? fase
          : { ...fase, etapas: fase.etapas.filter((_, stepIndex) => stepIndex !== etapaIndex) },
      ),
    }));
  }

  function salvar() {
    const limpo = {
      ...draft,
      codigo: draft.codigo.trim().toLowerCase().replace(/\s+/g, "-"),
      nome: draft.nome.trim(),
      versao: draft.versao.trim(),
    };
    if (!limpo.nome || !limpo.codigo) {
      toast.error("Informe nome e código do programa.");
      return;
    }
    salvarPrograma(limpo);
    toast.success("Jornada atualizada. Novos casos usarão esta configuração.");
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar programa"
      description="Configure etapas, responsáveis e fases. Isso não altera jornadas já criadas."
      className="max-w-4xl"
    >
      <div className="max-h-[68vh] overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Nome do programa"
            value={draft.nome}
            onChange={(event) => setDraft({ ...draft, nome: event.target.value })}
          />
          <Input
            label="Código"
            value={draft.codigo}
            onChange={(event) => setDraft({ ...draft, codigo: event.target.value })}
          />
          <Input
            label="Versão"
            value={draft.versao}
            onChange={(event) => setDraft({ ...draft, versao: event.target.value })}
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={draft.ativo}
            onChange={(event) => setDraft({ ...draft, ativo: event.target.checked })}
            className="h-4 w-4 accent-gold-600"
          />
          Disponibilizar este programa para novos contratos
        </label>

        <div className="mt-6 flex flex-col gap-4">
          {draft.fasesTemplate.map((fase, faseIndex) => (
            <section key={fase.id} className="rounded-xl border border-border bg-cream-50/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
                  Fase {faseIndex + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removerFase(faseIndex)}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Remover fase
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Título"
                  value={fase.titulo}
                  onChange={(event) => atualizarFase(faseIndex, { titulo: event.target.value })}
                />
                <Textarea
                  label="Descrição"
                  rows={1}
                  value={fase.descricao}
                  onChange={(event) => atualizarFase(faseIndex, { descricao: event.target.value })}
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {fase.etapas.map((etapa, etapaIndex) => (
                  <div key={etapa.id} className="rounded-lg border border-border bg-white p-3">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                      <Input
                        value={etapa.titulo}
                        aria-label={`Título da etapa ${etapaIndex + 1}`}
                        onChange={(event) =>
                          atualizarEtapa(faseIndex, etapaIndex, { titulo: event.target.value })
                        }
                      />
                      <Select
                        value={etapa.responsavel}
                        aria-label={`Responsável pela etapa ${etapaIndex + 1}`}
                        onChange={(event) =>
                          atualizarEtapa(faseIndex, etapaIndex, {
                            responsavel: event.target.value as ResponsavelEtapa,
                          })
                        }
                      >
                        {RESPONSAVEIS.map((responsavel) => (
                          <option key={responsavel} value={responsavel}>
                            {responsavel}
                          </option>
                        ))}
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removerEtapa(faseIndex, etapaIndex)}
                        aria-label="Remover etapa"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                    <Textarea
                      className="mt-2"
                      rows={1}
                      value={etapa.descricao}
                      aria-label={`Descrição da etapa ${etapaIndex + 1}`}
                      onChange={(event) =>
                        atualizarEtapa(faseIndex, etapaIndex, { descricao: event.target.value })
                      }
                    />
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  onClick={() => adicionarEtapa(faseIndex)}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Adicionar etapa
                </Button>
              </div>
            </section>
          ))}
          <Button variant="secondary" className="self-start" onClick={adicionarFase}>
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar fase
          </Button>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={salvar}>Salvar configuração</Button>
      </div>
    </Modal>
  );
}

function ProgramMetric({
  icon: Icon,
  value,
  label,
}: { icon: typeof Route; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gold-300">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-slate-300">{label}</p>
      </div>
    </div>
  );
}
