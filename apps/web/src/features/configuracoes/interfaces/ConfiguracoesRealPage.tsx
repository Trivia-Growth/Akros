import { erroDetalhado } from "@/shared/lib/http/edge-function-error";
import { getSupabase } from "@/shared/supabase/client";
import { Badge, Button, Card, Checkbox, Input, Modal, Select, Textarea, toast } from "@/shared/ui";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileAudio,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useConfiguracoesReais } from "../application/hooks";
import type {
  AgenteIAIntegracao,
  ContaCanalConectada,
  EscopoConta,
  ProvedorAgenda,
  ProvedorCanal,
} from "../domain/types";

const PROVEDOR_AGENDA: Record<ProvedorAgenda, string> = {
  google: "Google Workspace",
  microsoft: "Microsoft 365",
  calendly: "Calendly",
};

const PROVEDOR_CANAL: Record<ProvedorCanal, string> = {
  whatsapp_oficial: "WhatsApp Oficial",
  evolution: "Evolution (WhatsApp)",
  instagram: "Instagram",
};

const ESCOPO: Record<EscopoConta, string> = {
  agenda: "Agenda",
  email: "E-mail",
  arquivos: "Arquivos",
};

export function ConfiguracoesRealPage() {
  const { equipe, integracoes, contasAgenda, contasCanal, agentesIA, carregando, erro, refetch } =
    useConfiguracoesReais();

  if (carregando) return <Estado mensagem="Carregando configurações reais…" />;
  if (erro) return <Estado mensagem="Não foi possível carregar as configurações." erro />;

  const ativas = integracoes.filter((integracao) => integracao.ativa).length;
  return (
    <div className="flex flex-col gap-6">
      <Cabecalho />
      <div className="grid gap-4 lg:grid-cols-3">
        <Metrica label="Integrações ativas" valor={`${ativas}/${integracoes.length}`} />
        <Metrica label="Pessoas na equipe" valor={equipe.length} />
        <Metrica label="Contas conectadas" valor={contasAgenda.length + contasCanal.length} />
      </div>

      <Secao titulo="Integrações externas" icone={Settings2}>
        {integracoes.length === 0 ? (
          <Vazio texto="Nenhuma integração real cadastrada." />
        ) : (
          integracoes.map((integracao) => (
            <Linha
              key={integracao.id}
              titulo={`${integracao.nome} · ${integracao.fornecedor}`}
              detalhe={integracao.descricao}
              status={integracao.ativa ? "Ativa" : "Inativa"}
            />
          ))
        )}
      </Secao>

      <Secao titulo="Equipe operacional" icone={Users}>
        {equipe.length === 0 ? (
          <Vazio texto="Nenhum membro da equipe real cadastrado." />
        ) : (
          equipe.map((membro) => (
            <Linha key={membro.id} titulo={membro.nome} detalhe={membro.cargo} />
          ))
        )}
      </Secao>

      <Secao titulo="Contas conectadas" icone={CalendarClock}>
        {contasAgenda.length === 0 ? (
          <Vazio texto="Nenhuma conta de agenda, e-mail ou arquivos conectada." />
        ) : (
          contasAgenda.map((conta) => (
            <Linha
              key={conta.id}
              titulo={conta.nomeExibicao}
              detalhe={`${PROVEDOR_AGENDA[conta.provedor]} · ${conta.escopos.map((item) => ESCOPO[item]).join(", ")}`}
              status={conta.ativa ? "Ativa" : "Inativa"}
            />
          ))
        )}
      </Secao>

      <Secao titulo="Contas de canal" icone={MessageCircle}>
        {contasCanal.length === 0 ? (
          <Vazio texto="Nenhuma conta de WhatsApp ou Instagram conectada." />
        ) : (
          contasCanal.map((conta) => (
            <Linha
              key={conta.id}
              titulo={conta.nomeExibicao}
              detalhe={`${PROVEDOR_CANAL[conta.provedor]} · ${conta.identificador}`}
              status={conta.ativa ? "Ativa" : "Inativa"}
            />
          ))
        )}
      </Secao>

      <IntegracaoAgentes contasCanal={contasCanal} agentesIA={agentesIA} aoSalvar={refetch} />
    </div>
  );
}

interface FormularioAgente {
  contaId: string;
  nomeConta: string;
  identificador: string;
  baseUrl: string;
  instancia: string;
  chaveEvolution: string;
  canalAtivo: boolean;
  agenteId: string;
  nomeAgente: string;
  funcao: string;
  alma: string;
  saudacao: string;
  handoff: string;
  modelo: string;
  chaveOpenRouter: string;
  agenteAtivo: boolean;
}

const FORMULARIO_INICIAL: FormularioAgente = {
  contaId: "",
  nomeConta: "WhatsApp Akros",
  identificador: "",
  baseUrl: "",
  instancia: "",
  chaveEvolution: "",
  canalAtivo: true,
  agenteId: "",
  nomeAgente: "Assistente Akros",
  funcao: "primeiro atendimento e triagem",
  alma: "Acolha, esclareça próximos passos gerais e encaminhe casos que exijam análise humana. Não dê aconselhamento jurídico.",
  saudacao: "Olá! Sou assistente virtual da Akros. Como posso ajudar?",
  handoff:
    "Vou encaminhar sua mensagem para nossa equipe humana e retornaremos assim que possível.",
  modelo: "openai/gpt-4.1-mini",
  chaveOpenRouter: "",
  agenteAtivo: false,
};

function IntegracaoAgentes({
  contasCanal,
  agentesIA,
  aoSalvar,
}: {
  contasCanal: ContaCanalConectada[];
  agentesIA: AgenteIAIntegracao[];
  aoSalvar: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const contasEvolution = contasCanal.filter((conta) => conta.provedor === "evolution");

  function alterar<K extends keyof FormularioAgente>(chave: K, valor: FormularioAgente[K]) {
    setFormulario((atual) => ({ ...atual, [chave]: valor }));
  }

  function escolherConta(id: string) {
    const conta = contasEvolution.find((item) => item.id === id);
    setFormulario((atual) => ({
      ...atual,
      contaId: id === "nova" ? "" : id,
      nomeConta: conta?.nomeExibicao ?? atual.nomeConta,
      identificador: conta?.identificador ?? "",
      baseUrl: conta?.evolution?.baseUrl ?? "",
      instancia: conta?.evolution?.instancia ?? "",
      chaveEvolution: "",
      canalAtivo: conta?.ativa ?? true,
    }));
  }

  function escolherAgente(id: string) {
    const agente = agentesIA.find((item) => item.id === id);
    setFormulario((atual) => ({
      ...atual,
      agenteId: id === "novo" ? "" : id,
      nomeAgente: agente?.nome ?? FORMULARIO_INICIAL.nomeAgente,
      funcao: agente?.funcao ?? FORMULARIO_INICIAL.funcao,
      alma: agente?.alma ?? FORMULARIO_INICIAL.alma,
      saudacao: agente?.saudacao ?? FORMULARIO_INICIAL.saudacao,
      handoff: agente?.mensagemHandoff ?? FORMULARIO_INICIAL.handoff,
      modelo: agente?.modelo || FORMULARIO_INICIAL.modelo,
      chaveOpenRouter: "",
      agenteAtivo: agente?.ativo ?? false,
    }));
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const { error } = await getSupabase().functions.invoke("integracoes-ia-salvar", {
        headers: { "x-akros-csrf": "1" },
        body: {
          evolution: {
            ...(formulario.contaId ? { contaId: formulario.contaId } : {}),
            nomeExibicao: formulario.nomeConta,
            identificador: formulario.identificador,
            baseUrl: formulario.baseUrl,
            instancia: formulario.instancia,
            ...(formulario.chaveEvolution ? { apiKey: formulario.chaveEvolution } : {}),
            ativa: formulario.canalAtivo,
          },
          agente: {
            ...(formulario.agenteId ? { agenteId: formulario.agenteId } : {}),
            nome: formulario.nomeAgente,
            funcao: formulario.funcao,
            alma: formulario.alma,
            saudacao: formulario.saudacao,
            mensagemHandoff: formulario.handoff,
            modelo: formulario.modelo,
            ...(formulario.chaveOpenRouter ? { apiKeyOpenRouter: formulario.chaveOpenRouter } : {}),
            ativo: formulario.agenteAtivo,
          },
        },
      });
      if (error) throw await erroDetalhado(error);

      // Campo password volta vazio antes de qualquer rerender/releitura. Nunca há localStorage.
      setFormulario((atual) => ({ ...atual, chaveEvolution: "", chaveOpenRouter: "" }));
      await aoSalvar();
      setAberto(false);
      toast.success(
        formulario.agenteAtivo
          ? "Canal e agente ativos. Mensagens novas poderão receber resposta."
          : "Integração salva. Agente continua desligado.",
      );
    } catch (causa) {
      toast.error(causa instanceof Error ? causa.message : "Não foi possível salvar integração.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Secao titulo="Agente WhatsApp · Evolution + OpenRouter" icone={Bot}>
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-navy">
              {agentesIA.length === 0
                ? "Nenhum agente real configurado."
                : `${agentesIA.length} agente(s) configurado(s).`}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Chaves são enviadas uma vez por HTTPS, guardadas cifradas no Vault e nunca aparecem de
              novo nesta tela. O webhook da Evolution é registrado automaticamente.
            </p>
          </div>
          <Button size="sm" onClick={() => setAberto(true)}>
            <KeyRound className="h-4 w-4" aria-hidden />
            Configurar agente
          </Button>
        </div>
        {agentesIA.map((agente) => (
          <Linha
            key={agente.id}
            titulo={agente.nome}
            detalhe={`${agente.funcao} · ${agente.modelo || "modelo pendente"}`}
            status={agente.ativo ? "Ativa" : "Inativa"}
          />
        ))}
        <div className="flex gap-2 rounded-lg bg-cream-100 px-3 py-2.5 text-xs text-ink-soft">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
          Ativação começa desligada. Pedido jurídico, financeiro ou por humano recebe handoff; o
          agente não tem ferramentas nem acesso a dados internos.
        </div>
      </div>

      <Modal
        open={aberto}
        onClose={() => !enviando && setAberto(false)}
        title="Configurar agente WhatsApp"
        description="A chave não será mostrada novamente. Deixe em branco apenas para manter chave já configurada."
        className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto"
      >
        <form className="flex flex-col gap-4" onSubmit={salvar}>
          <div className="rounded-lg border border-border bg-cream-50 p-3 text-xs text-ink-soft">
            <div className="flex gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />A chave
              não entra em tabela pública, log ou resposta da API. Vault cifra valor; somente
              backend com permissão de serviço consegue usá-lo.
            </div>
          </div>

          <h3 className="text-sm font-semibold text-navy">Canal Evolution</h3>
          <Select
            label="Conta Evolution"
            value={formulario.contaId || "nova"}
            onChange={(evento) => escolherConta(evento.target.value)}
          >
            <option value="nova">Nova conta Evolution</option>
            {contasEvolution.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.nomeExibicao} · {conta.identificador}
              </option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              label="Nome exibido"
              value={formulario.nomeConta}
              onChange={(evento) => alterar("nomeConta", evento.target.value)}
            />
            <Input
              required
              label="Número WhatsApp"
              placeholder="5511999999999"
              value={formulario.identificador}
              onChange={(evento) => alterar("identificador", evento.target.value)}
            />
          </div>
          <Input
            required
            type="url"
            label="URL HTTPS da Evolution"
            placeholder="https://evolution.suaempresa.com"
            value={formulario.baseUrl}
            onChange={(evento) => alterar("baseUrl", evento.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              label="Nome da instância"
              value={formulario.instancia}
              onChange={(evento) => alterar("instancia", evento.target.value)}
            />
            <Input
              type="password"
              autoComplete="new-password"
              label="API key Evolution"
              hint={
                formulario.contaId
                  ? "Vazio mantém a chave guardada."
                  : "Obrigatória na primeira configuração."
              }
              value={formulario.chaveEvolution}
              onChange={(evento) => alterar("chaveEvolution", evento.target.value)}
            />
          </div>
          <Checkbox
            label="Canal conectado e apto a receber mensagens"
            checked={formulario.canalAtivo}
            onChange={(evento) => alterar("canalAtivo", evento.target.checked)}
          />

          <h3 className="border-t border-border pt-4 text-sm font-semibold text-navy">
            Agente OpenRouter
          </h3>
          <Select
            label="Agente"
            value={formulario.agenteId || "novo"}
            onChange={(evento) => escolherAgente(evento.target.value)}
          >
            <option value="novo">Novo agente</option>
            {agentesIA.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {agente.nome}
              </option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              label="Nome do agente"
              value={formulario.nomeAgente}
              onChange={(evento) => alterar("nomeAgente", evento.target.value)}
            />
            <Input
              required
              label="Função"
              value={formulario.funcao}
              onChange={(evento) => alterar("funcao", evento.target.value)}
            />
          </div>
          <Textarea
            required
            label="Orientação e tom"
            value={formulario.alma}
            onChange={(evento) => alterar("alma", evento.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Textarea
              required
              label="Saudação"
              rows={3}
              value={formulario.saudacao}
              onChange={(evento) => alterar("saudacao", evento.target.value)}
            />
            <Textarea
              required
              label="Mensagem de handoff"
              rows={3}
              value={formulario.handoff}
              onChange={(evento) => alterar("handoff", evento.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              label="Modelo OpenRouter"
              hint="Use identificador do catálogo OpenRouter."
              value={formulario.modelo}
              onChange={(evento) => alterar("modelo", evento.target.value)}
            />
            <Input
              type="password"
              autoComplete="new-password"
              label="API key OpenRouter"
              hint={
                formulario.agenteId
                  ? "Vazio mantém a chave guardada."
                  : "Obrigatória na primeira configuração."
              }
              value={formulario.chaveOpenRouter}
              onChange={(evento) => alterar("chaveOpenRouter", evento.target.value)}
            />
          </div>
          <Checkbox
            label="Ativar agente agora — ele responderá novas mensagens deste canal"
            checked={formulario.agenteAtivo}
            onChange={(evento) => alterar("agenteAtivo", evento.target.checked)}
          />
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAberto(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={enviando}>
              Salvar com segurança
            </Button>
          </div>
        </form>
      </Modal>
    </Secao>
  );
}

function Cabecalho() {
  return (
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
          Akros OS · operação conectada
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
          Central de configurações
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Leitura do ambiente real. Coleções vazias permanecem vazias — a demonstração não é usada
          como fallback.
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-subtle">
        <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-navy">Ambiente conectado</p>
          <p className="text-xs text-ink-muted">Dados administrativos protegidos por RLS</p>
        </div>
      </div>
    </div>
  );
}

function Estado({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Cabecalho />
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        {erro ? (
          <CircleAlert className="h-4 w-4 text-red-600" />
        ) : (
          <FileAudio className="h-4 w-4" />
        )}
        {mensagem}
      </Card>
    </div>
  );
}

function Metrica({ label, valor }: { label: string; valor: number | string }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-label text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy">{valor}</p>
    </Card>
  );
}

function Secao({
  titulo,
  icone: Icone,
  children,
}: {
  titulo: string;
  icone: typeof CalendarClock;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Icone className="h-4 w-4 text-gold-700" aria-hidden />
        <h2 className="text-base font-semibold text-navy">{titulo}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="px-5 py-6 text-sm text-ink-muted">{texto}</p>;
}

function Linha({ titulo, detalhe, status }: { titulo: string; detalhe: string; status?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="font-medium text-navy">{titulo}</p>
        <p className="mt-0.5 text-sm text-ink-soft">{detalhe}</p>
      </div>
      {status && <Badge variant={status === "Ativa" ? "success" : "neutral"}>{status}</Badge>}
    </div>
  );
}
