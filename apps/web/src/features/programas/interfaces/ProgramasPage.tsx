import { useClientesSupabase } from "@/features/crm/application/useClientesSupabase";
import { useSessaoAtual } from "@/features/sessao/application/hooks";
import { Badge, Button, Card, Input, Modal, Select, Textarea, toast } from "@/shared/ui";
import { cn } from "@/shared/ui/utils/cn";
import {
  Copy,
  FileText,
  Layers3,
  Paperclip,
  PencilLine,
  Plus,
  Route,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useProgramasReais, useRequisitoDocumentoRepo } from "../application/hooks";
import { validarRequisitoDocumento } from "../application/validacao";
import type {
  ArquivoReferencia,
  EmissorDocumento,
  EtapaTemplate,
  FaseTemplate,
  Programa,
  RequisitoDocumento,
  ResponsavelEtapa,
} from "../domain/types";

const RESPONSAVEIS: ResponsavelEtapa[] = ["cliente", "akros", "terceiro", "uscis"];
const EMISSORES: EmissorDocumento[] = [
  "cliente",
  "empregador",
  "instituicao",
  "terceiro_certificado",
];

export function ProgramasPage() {
  const { programas, carregando, erro, duplicar, salvar } = useProgramasReais();
  const { clientes } = useClientesSupabase();
  const sessao = useSessaoAtual();
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
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

  async function handleDuplicar() {
    if (!selecionado) return;
    try {
      const copia = await duplicar(selecionado.id);
      if (!copia) return;
      setSelecionadoId(copia.id);
      setEditorOpen(true);
      toast.success("Programa duplicado. Ajuste a nova versão antes de ativá-la.");
    } catch {
      toast.error("Não foi possível duplicar o programa.");
    }
  }

  if (carregando) return <EstadoCatalogo mensagem="Carregando programas…" />;
  if (erro) return <EstadoCatalogo mensagem="Não foi possível carregar o catálogo de programas." />;
  if (!selecionado)
    return (
      <EstadoCatalogo mensagem="Nenhum programa real cadastrado. Crie o primeiro programa para começar." />
    );

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
                      {selecionado.documentosExigidos.some(
                        (requisito) =>
                          requisito.faseTemplateId === fase.id && requisito.ativo !== false,
                      ) && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-border pt-3">
                          {selecionado.documentosExigidos
                            .filter(
                              (requisito) =>
                                requisito.faseTemplateId === fase.id && requisito.ativo !== false,
                            )
                            .map((requisito) => (
                              <span
                                key={requisito.id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs text-ink-soft"
                              >
                                <FileText
                                  className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                                  aria-hidden
                                />
                                {requisito.titulo}
                                {requisito.analiseIA?.habilitada && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-label text-gold-800"
                                    title="Análise por IA configurada para este requisito"
                                  >
                                    <Sparkles className="h-3 w-3" aria-hidden />
                                    IA
                                  </span>
                                )}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="flex items-center gap-3 border-gold-200 bg-gold-50/45">
            <Sparkles className="h-5 w-5 shrink-0 text-gold-700" aria-hidden />
            <p className="text-sm text-ink-soft">
              Documentos exigidos usam o mesmo editor visual das etapas. Em cada um, você pode ligar
              a análise por IA e dar a ela uma instrução (skill) e um arquivo de referência próprios
              — o parecer fica mais preciso, mas a aprovação continua sempre humana.
            </p>
          </Card>
        </div>
      </div>

      {editorOpen && (
        <ProgramaEditor
          programa={selecionado}
          autor={sessao?.usuario.email ?? "admin"}
          onClose={() => setEditorOpen(false)}
          onSalvar={salvar}
        />
      )}
    </div>
  );
}

function EstadoCatalogo({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
          Configuração da operação
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
          Programas e jornadas
        </h1>
      </div>
      <Card className="text-sm text-ink-soft">{mensagem}</Card>
    </div>
  );
}

function ProgramaEditor({
  programa,
  autor,
  onClose,
  onSalvar,
}: {
  programa: Programa;
  autor: string;
  onClose: () => void;
  onSalvar: (programa: Programa) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Programa>(() => structuredClone(programa));
  const requisitosRepo = useRequisitoDocumentoRepo();

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

  function adicionarRequisito(faseId: string) {
    setDraft((atual) => ({
      ...atual,
      documentosExigidos: [
        ...atual.documentosExigidos,
        {
          id: `requisito-${crypto.randomUUID().slice(0, 6)}`,
          faseTemplateId: faseId,
          tipo: "outro",
          titulo: "Novo documento",
          objetivo: "Descreva para que este documento serve.",
          obrigatorio: true,
          emitidoPor: "cliente",
        } satisfies RequisitoDocumento,
      ],
    }));
  }

  function atualizarRequisito(requisitoId: string, patch: Partial<RequisitoDocumento>) {
    setDraft((atual) => ({
      ...atual,
      documentosExigidos: atual.documentosExigidos.map((requisito) =>
        requisito.id === requisitoId ? { ...requisito, ...patch } : requisito,
      ),
    }));
  }

  function removerRequisito(requisitoId: string) {
    setDraft((atual) => ({
      ...atual,
      documentosExigidos: atual.documentosExigidos.filter(
        (requisito) => requisito.id !== requisitoId,
      ),
    }));
  }

  /** E06-S05 AC-2 — remoção só é oferecida quando nenhum Documento de cliente aponta para o
   * requisito; com vínculos, oferece "desativar" (preserva o histórico dos casos em andamento). */
  async function tentarRemoverRequisito(requisitoId: string) {
    if (!requisitosRepo) {
      removerRequisito(requisitoId);
      return;
    }
    try {
      const vinculados = await requisitosRepo.contarDocumentosVinculados(requisitoId);
      if (vinculados === 0) {
        removerRequisito(requisitoId);
        return;
      }
      const desativar = window.confirm(
        `Este requisito tem ${vinculados} documento(s) de cliente vinculado(s) e não pode ser removido. Desativá-lo? Requisitos desativados deixam de ser exigidos em novos casos, mas o histórico dos casos em andamento é preservado.`,
      );
      if (desativar) atualizarRequisito(requisitoId, { ativo: false });
    } catch {
      toast.error("Não foi possível verificar os vínculos deste requisito. Tente novamente.");
    }
  }

  /** E06-S05 AC-6 — o upload grava o histórico de trocas no repositório (quem/quando) e o
   * retorno entra no draft para ser persistido junto com o restante da configuração. */
  async function anexarArquivoReferencia(
    requisitoId: string,
    arquivo: File,
  ): Promise<ArquivoReferencia> {
    if (!requisitosRepo) throw new Error("Repositório de requisitos indisponível.");
    return requisitosRepo.salvarArquivoReferencia(requisitoId, arquivo, autor);
  }

  async function salvar() {
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
    for (const requisito of limpo.documentosExigidos) {
      const invalido = validarRequisitoDocumento(requisito);
      if (invalido) {
        toast.error(invalido);
        return;
      }
    }
    try {
      await onSalvar(limpo);
      toast.success("Jornada atualizada. Novos casos usarão esta configuração.");
      onClose();
    } catch {
      toast.error("Não foi possível salvar a configuração.");
    }
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

              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-label text-gold-700">
                  Documentos exigidos desta fase
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {draft.documentosExigidos
                    .filter((requisito) => requisito.faseTemplateId === fase.id)
                    .map((requisito) => (
                      <RequisitoEditor
                        key={requisito.id}
                        requisito={requisito}
                        persistido={programa.documentosExigidos.some(
                          (existente) => existente.id === requisito.id,
                        )}
                        onChange={(patch) => atualizarRequisito(requisito.id, patch)}
                        onRemover={() => void tentarRemoverRequisito(requisito.id)}
                        onAnexar={anexarArquivoReferencia}
                      />
                    ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => adicionarRequisito(fase.id)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Adicionar documento exigido
                  </Button>
                </div>
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

function RequisitoEditor({
  requisito,
  persistido,
  onChange,
  onRemover,
  onAnexar,
}: {
  requisito: RequisitoDocumento;
  /** false para requisito ainda não salvo (id local do draft) — upload só após salvar. */
  persistido: boolean;
  onChange: (patch: Partial<RequisitoDocumento>) => void;
  onRemover: () => void;
  onAnexar: (requisitoId: string, arquivo: File) => Promise<ArquivoReferencia>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anexando, setAnexando] = useState(false);
  const analiseIA = requisito.analiseIA;
  const habilitada = analiseIA?.habilitada ?? false;
  const desativado = requisito.ativo === false;
  const historico = requisito.historicoArquivosReferencia ?? [];

  function alternarAnaliseIA() {
    onChange({
      analiseIA: {
        habilitada: !habilitada,
        skill: analiseIA?.skill ?? "",
        arquivoReferenciaId: analiseIA?.arquivoReferenciaId,
        arquivoReferenciaNome: analiseIA?.arquivoReferenciaNome,
      },
    });
  }

  function atualizarSkill(skill: string) {
    onChange({
      analiseIA: {
        habilitada: true,
        skill,
        arquivoReferenciaId: analiseIA?.arquivoReferenciaId,
        arquivoReferenciaNome: analiseIA?.arquivoReferenciaNome,
      },
    });
  }

  /** E06-S05 AC-6 — o upload passa pelo repositório (grava o histórico quem/quando) e o
   * retorno entra no draft; o arquivo anterior migra para o histórico em vez de sumir.
   * Binário não persiste — só metadado, mesma regra do upload do cliente (E02-S03). */
  async function anexarArquivo(file: File | undefined) {
    if (!file) return;
    setAnexando(true);
    try {
      const referencia = await onAnexar(requisito.id, file);
      const anterior: ArquivoReferencia[] = analiseIA?.arquivoReferenciaId
        ? [
            {
              id: analiseIA.arquivoReferenciaId,
              requisitoId: requisito.id,
              nomeArquivo: analiseIA.arquivoReferenciaNome ?? "(sem nome registrado)",
              tamanhoBytes: 0,
              enviadoEm: "",
              enviadoPor: "(legado — anterior ao histórico)",
            },
          ]
        : [];
      onChange({
        analiseIA: {
          habilitada: true,
          skill: analiseIA?.skill ?? "",
          arquivoReferenciaId: referencia.id,
          arquivoReferenciaNome: referencia.nomeArquivo,
        },
        historicoArquivosReferencia: [...anterior, ...historico],
      });
      toast.success(`Arquivo de referência "${referencia.nomeArquivo}" registrado.`);
    } catch {
      toast.error("Não foi possível registrar o arquivo de referência.");
    } finally {
      setAnexando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className={cn("rounded-lg border border-border bg-white p-3", desativado && "opacity-70")}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_11rem_auto]">
        <Input
          value={requisito.titulo}
          aria-label="Título do documento"
          onChange={(event) => onChange({ titulo: event.target.value })}
        />
        <Input
          value={requisito.tipo}
          aria-label="Tipo do documento"
          placeholder="tipo (ex: carta_experiencia)"
          onChange={(event) => onChange({ tipo: event.target.value })}
        />
        <Select
          value={requisito.emitidoPor}
          aria-label="Emitido por"
          onChange={(event) => onChange({ emitidoPor: event.target.value as EmissorDocumento })}
        >
          {EMISSORES.map((emissor) => (
            <option key={emissor} value={emissor}>
              {emissor}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemover}
          aria-label="Remover documento exigido"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {desativado && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border bg-cream-50 px-2.5 py-1.5">
          <span className="text-xs font-medium text-ink-soft">
            Desativado — não é exigido em novos casos; histórico preservado nos casos em andamento.
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-gold-700 hover:text-gold-800"
            onClick={() => onChange({ ativo: true })}
          >
            Reativar
          </button>
        </div>
      )}
      <Textarea
        className="mt-2"
        rows={1}
        value={requisito.objetivo}
        aria-label="Objetivo do documento"
        onChange={(event) => onChange({ objetivo: event.target.value })}
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={requisito.obrigatorio}
          onChange={(event) => onChange({ obrigatorio: event.target.checked })}
          className="h-3.5 w-3.5 accent-gold-600"
        />
        Obrigatório
      </label>

      <div className="mt-3 rounded-md border border-dashed border-gold-200 bg-gold-50/35 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-navy">
            <Sparkles className="h-4 w-4 text-gold-700" aria-hidden />
            Analisar com IA
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={habilitada}
            onClick={alternarAnaliseIA}
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
              habilitada ? "bg-gold-600" : "bg-cream-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-subtle transition-transform duration-150",
                habilitada ? "translate-x-[1.375rem]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>

        {habilitada && (
          <div className="mt-3 flex flex-col gap-2.5">
            <Textarea
              label="Skill: instrução para a IA"
              rows={2}
              value={analiseIA?.skill ?? ""}
              placeholder="Ex.: Verifique se a carta está em papel timbrado, assinada, e menciona cargo e datas de início/fim. Compare o cargo com o currículo enviado."
              onChange={(event) => atualizarSkill(event.target.value)}
              hint="Usada pela IA para gerar o parecer deste requisito. A aprovação continua sempre humana."
            />
            <div>
              <p className="text-sm font-medium text-ink">Arquivo de referência (opcional)</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!persistido || anexando}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5" aria-hidden />
                  {anexando
                    ? "Registrando…"
                    : analiseIA?.arquivoReferenciaNome
                      ? "Trocar arquivo"
                      : "Anexar arquivo"}
                </Button>
                {analiseIA?.arquivoReferenciaNome && (
                  <span className="truncate text-xs text-ink-soft">
                    {analiseIA.arquivoReferenciaNome}
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(event) => void anexarArquivo(event.target.files?.[0])}
                />
              </div>
              {!persistido && (
                <p className="mt-1 text-xs text-ink-muted">
                  Salve o programa para anexar o arquivo de referência.
                </p>
              )}
            </div>
          </div>
        )}

        {historico.length > 0 && (
          <div className="mt-3 border-t border-dashed border-gold-200 pt-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-label text-ink-muted">
              Histórico de arquivos de referência
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {historico.map((entrada) => (
                <li key={entrada.id} className="flex items-baseline gap-2 text-xs text-ink-soft">
                  <Paperclip
                    className="h-3 w-3 shrink-0 translate-y-0.5 text-ink-muted"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{entrada.nomeArquivo}</span>
                  <span className="shrink-0 text-ink-muted">
                    {entrada.enviadoPor}
                    {entrada.enviadoEm &&
                      ` · ${new Date(entrada.enviadoEm).toLocaleString("pt-BR")}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
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
