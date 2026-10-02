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
import {
  AGENTE_INICIAL,
  CANAL_INICIAL,
  type FormularioAgente,
  type FormularioCanal,
  corpoDeSalvar,
  gerarTokenVerificacao,
  limparSegredos,
  urlWebhookConta,
} from "../application/integracao-canal";
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

const ROTULO_CANAL: Record<ProvedorCanal, string> = {
  evolution: "WhatsApp · Evolution",
  whatsapp_oficial: "WhatsApp · API oficial (Meta)",
  instagram: "Instagram · Direct (Meta)",
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
  // Começa só com o agente: testar no Playground vem antes de conectar um número ou conta.
  const [conectarCanal, setConectarCanal] = useState(false);
  const [canal, setCanal] = useState<FormularioCanal>(CANAL_INICIAL);
  const [agente, setAgente] = useState<FormularioAgente>(AGENTE_INICIAL);
  const [resultado, setResultado] = useState<{
    provedor: ProvedorCanal;
    webhookUrl: string;
  } | null>(null);
  const contasDoTipo = contasCanal.filter((conta) => conta.provedor === canal.provedor);
  const ehMeta = canal.provedor !== "evolution";
  const primeiraVez = !canal.contaId;
  const urlProjeto = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const urlDaConta = urlWebhookConta(urlProjeto, canal.provedor, canal.contaId);

  function alterarCanal<K extends keyof FormularioCanal>(chave: K, valor: FormularioCanal[K]) {
    setCanal((atual) => ({ ...atual, [chave]: valor }));
  }

  function alterarAgente<K extends keyof FormularioAgente>(chave: K, valor: FormularioAgente[K]) {
    setAgente((atual) => ({ ...atual, [chave]: valor }));
  }

  function escolherTipo(provedor: ProvedorCanal) {
    // Trocar o tipo zera tudo do canal: campo de um provedor não pode vazar para o corpo de outro.
    setCanal({
      ...CANAL_INICIAL,
      provedor,
      nomeConta: provedor === "instagram" ? "Instagram Akros" : "WhatsApp Akros",
    });
    setResultado(null);
  }

  function escolherConta(id: string) {
    const conta = contasDoTipo.find((item) => item.id === id);
    setResultado(null);
    setCanal({
      ...CANAL_INICIAL,
      provedor: canal.provedor,
      contaId: id === "nova" ? "" : id,
      nomeConta: conta?.nomeExibicao ?? CANAL_INICIAL.nomeConta,
      identificador: conta?.identificador ?? "",
      ativa: conta?.ativa ?? true,
      baseUrl: conta?.evolution?.baseUrl ?? "",
      instancia: conta?.evolution?.instancia ?? "",
      phoneNumberId: conta?.meta?.phoneNumberId ?? "",
      wabaId: conta?.meta?.wabaId ?? "",
      igAccountId: conta?.meta?.igAccountId ?? "",
    });
  }

  function escolherAgente(id: string) {
    const existente = agentesIA.find((item) => item.id === id);
    setAgente({
      agenteId: id === "novo" ? "" : id,
      nomeAgente: existente?.nome ?? AGENTE_INICIAL.nomeAgente,
      funcao: existente?.funcao ?? AGENTE_INICIAL.funcao,
      alma: existente?.alma ?? AGENTE_INICIAL.alma,
      saudacao: existente?.saudacao ?? AGENTE_INICIAL.saudacao,
      handoff: existente?.mensagemHandoff ?? AGENTE_INICIAL.handoff,
      modelo: existente?.modelo || AGENTE_INICIAL.modelo,
      chaveOpenRouter: "",
      agenteAtivo: existente?.ativo ?? false,
    });
  }

  async function copiar(valor: string, nome: string) {
    try {
      await navigator.clipboard.writeText(valor);
      toast.success(`${nome} copiado.`);
    } catch {
      toast.error("Não foi possível copiar; selecione e copie manualmente.");
    }
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const { data, error } = await getSupabase().functions.invoke("integracoes-ia-salvar", {
        headers: { "x-akros-csrf": "1" },
        body: corpoDeSalvar(canal, agente, conectarCanal),
      });
      if (error) throw await erroDetalhado(error);

      const resposta = (data ?? {}) as { contaId?: string; webhookUrl?: string };
      // Credenciais voltam a vazio antes de qualquer rerender/releitura. Nunca há localStorage.
      setCanal((atual) => ({
        ...limparSegredos(atual),
        contaId: resposta.contaId ?? atual.contaId,
      }));
      setAgente((atual) => ({ ...atual, chaveOpenRouter: "" }));
      await aoSalvar();
      if (conectarCanal && ehMeta && resposta.webhookUrl) {
        // Meta: falta o passo no painel dela; mantém o diálogo aberto com o que copiar.
        setResultado({ provedor: canal.provedor, webhookUrl: resposta.webhookUrl });
      } else {
        setAberto(false);
      }
      toast.success(
        !conectarCanal
          ? "Agente salvo. Teste a conversa em Comunicação → Agente IA → Playground."
          : agente.agenteAtivo
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
    <Secao titulo="Agente de atendimento · WhatsApp e Instagram" icone={Bot}>
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-navy">
              {agentesIA.length === 0
                ? "Nenhum agente real configurado."
                : `${agentesIA.length} agente(s) configurado(s).`}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Escolha o canal (Evolution, API oficial do WhatsApp ou Direct do Instagram). Chaves
              são enviadas uma vez por HTTPS, guardadas cifradas no Vault e nunca aparecem de novo
              nesta tela.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setResultado(null);
              setAberto(true);
            }}
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            Configurar canal e agente
          </Button>
        </div>
        {agentesIA.map((item) => (
          <Linha
            key={item.id}
            titulo={item.nome}
            detalhe={`${item.funcao} · ${item.modelo || "modelo pendente"}`}
            status={item.ativo ? "Ativa" : "Inativa"}
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
        title="Configurar agente e canal"
        description="As chaves não serão mostradas novamente. Deixe em branco apenas para manter a chave já configurada."
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

          {resultado ? (
            <output
              data-testid="resultado-meta"
              className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
            >
              <p className="font-semibold">Falta um passo no painel da Meta</p>
              <p>
                Em <strong>Webhooks</strong> do seu app, cadastre o endereço e o token de
                verificação abaixo e assine o campo <strong>messages</strong>. A Meta só confirma
                depois de chamar o endereço, então salve aqui primeiro (já feito).
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 text-xs">
                  {resultado.webhookUrl}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => copiar(resultado.webhookUrl, "Endereço do webhook")}
                >
                  Copiar endereço
                </Button>
              </div>
              {canal.verifyToken ? (
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 text-xs">
                    {canal.verifyToken}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => copiar(canal.verifyToken, "Token de verificação")}
                  >
                    Copiar token
                  </Button>
                </div>
              ) : null}
            </output>
          ) : null}

          <Checkbox
            label="Conectar um canal agora (WhatsApp ou Instagram)"
            checked={conectarCanal}
            onChange={(evento) => setConectarCanal(evento.target.checked)}
          />
          {conectarCanal ? (
            <>
              <h3 className="text-sm font-semibold text-navy">Canal</h3>
              <Select
                label="Tipo de canal"
                value={canal.provedor}
                disabled={!primeiraVez}
                hint={primeiraVez ? undefined : "O tipo não muda numa conta existente."}
                onChange={(evento) => escolherTipo(evento.target.value as ProvedorCanal)}
              >
                {(Object.keys(ROTULO_CANAL) as ProvedorCanal[]).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ROTULO_CANAL[tipo]}
                  </option>
                ))}
              </Select>
              <Select
                label="Conta"
                value={canal.contaId || "nova"}
                onChange={(evento) => escolherConta(evento.target.value)}
              >
                <option value="nova">Nova conta</option>
                {contasDoTipo.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nomeExibicao} · {conta.identificador}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  required
                  label="Nome exibido"
                  value={canal.nomeConta}
                  onChange={(evento) => alterarCanal("nomeConta", evento.target.value)}
                />
                <Input
                  required
                  label={
                    canal.provedor === "instagram" ? "Usuário do Instagram" : "Número WhatsApp"
                  }
                  placeholder={
                    canal.provedor === "instagram" ? "akros.immigration" : "5511999999999"
                  }
                  value={canal.identificador}
                  onChange={(evento) => alterarCanal("identificador", evento.target.value)}
                />
              </div>

              {canal.provedor === "evolution" ? (
                <>
                  <Input
                    required
                    type="url"
                    label="URL HTTPS da Evolution"
                    placeholder="https://evolution.suaempresa.com"
                    value={canal.baseUrl}
                    onChange={(evento) => alterarCanal("baseUrl", evento.target.value)}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      required
                      label="Nome da instância"
                      value={canal.instancia}
                      onChange={(evento) => alterarCanal("instancia", evento.target.value)}
                    />
                    <Input
                      type="password"
                      autoComplete="new-password"
                      required={primeiraVez}
                      label="API key Evolution"
                      hint={
                        primeiraVez
                          ? "Obrigatória na primeira configuração."
                          : "Vazio mantém a chave guardada."
                      }
                      value={canal.chaveEvolution}
                      onChange={(evento) => alterarCanal("chaveEvolution", evento.target.value)}
                    />
                  </div>
                  <p className="text-xs text-ink-soft">
                    O webhook da Evolution é registrado automaticamente ao salvar. O número precisa
                    estar pareado (QR) no painel da própria Evolution.
                  </p>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {canal.provedor === "whatsapp_oficial" ? (
                      <>
                        <Input
                          required
                          inputMode="numeric"
                          label="ID do número de telefone"
                          hint="Phone number ID, no painel do WhatsApp da Meta."
                          value={canal.phoneNumberId}
                          onChange={(evento) => alterarCanal("phoneNumberId", evento.target.value)}
                        />
                        <Input
                          required
                          inputMode="numeric"
                          label="ID da conta WhatsApp Business"
                          hint="WABA ID. Webhooks de outra conta são ignorados."
                          value={canal.wabaId}
                          onChange={(evento) => alterarCanal("wabaId", evento.target.value)}
                        />
                      </>
                    ) : (
                      <Input
                        required
                        inputMode="numeric"
                        label="ID da conta do Instagram"
                        hint="Instagram business account ID (não é o @usuário)."
                        value={canal.igAccountId}
                        onChange={(evento) => alterarCanal("igAccountId", evento.target.value)}
                      />
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="password"
                      autoComplete="new-password"
                      required={primeiraVez}
                      label={
                        canal.provedor === "instagram"
                          ? "Page Access Token"
                          : "Token de acesso permanente"
                      }
                      hint={
                        primeiraVez
                          ? "Obrigatório na primeira configuração."
                          : "Vazio mantém o token guardado."
                      }
                      value={canal.accessToken}
                      onChange={(evento) => alterarCanal("accessToken", evento.target.value)}
                    />
                    <Input
                      type="password"
                      autoComplete="new-password"
                      required={primeiraVez}
                      label="App Secret"
                      hint={
                        primeiraVez
                          ? "Valida a assinatura dos webhooks."
                          : "Vazio mantém o guardado."
                      }
                      value={canal.appSecret}
                      onChange={(evento) => alterarCanal("appSecret", evento.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        required={primeiraVez}
                        label="Token de verificação do webhook"
                        hint="Invente um (8+ letras e números) ou gere; você o cola no painel da Meta."
                        value={canal.verifyToken}
                        onChange={(evento) => alterarCanal("verifyToken", evento.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => alterarCanal("verifyToken", gerarTokenVerificacao())}
                    >
                      Gerar
                    </Button>
                  </div>
                  {urlDaConta ? (
                    <p className="break-all text-xs text-ink-soft">
                      Endereço do webhook desta conta: <code>{urlDaConta}</code>
                    </p>
                  ) : null}
                </>
              )}
              <Checkbox
                label="Canal conectado e apto a receber mensagens"
                checked={canal.ativa}
                onChange={(evento) => alterarCanal("ativa", evento.target.checked)}
              />
            </>
          ) : (
            <p className="text-xs text-ink-soft">
              Sem canal, só o agente é salvo. Depois de salvar, converse com ele em Comunicação →
              Agente IA → Playground e ajuste a orientação antes de conectar um número.
            </p>
          )}

          <h3 className="border-t border-border pt-4 text-sm font-semibold text-navy">
            Agente OpenRouter
          </h3>
          <Select
            label="Agente"
            value={agente.agenteId || "novo"}
            onChange={(evento) => escolherAgente(evento.target.value)}
          >
            <option value="novo">Novo agente</option>
            {agentesIA.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              label="Nome do agente"
              value={agente.nomeAgente}
              onChange={(evento) => alterarAgente("nomeAgente", evento.target.value)}
            />
            <Input
              required
              label="Função"
              value={agente.funcao}
              onChange={(evento) => alterarAgente("funcao", evento.target.value)}
            />
          </div>
          <Textarea
            required
            label="Orientação e tom"
            value={agente.alma}
            onChange={(evento) => alterarAgente("alma", evento.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Textarea
              required
              label="Saudação"
              rows={3}
              value={agente.saudacao}
              onChange={(evento) => alterarAgente("saudacao", evento.target.value)}
            />
            <Textarea
              required
              label="Mensagem de handoff"
              rows={3}
              value={agente.handoff}
              onChange={(evento) => alterarAgente("handoff", evento.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              label="Modelo OpenRouter"
              hint="Use identificador do catálogo OpenRouter."
              value={agente.modelo}
              onChange={(evento) => alterarAgente("modelo", evento.target.value)}
            />
            <Input
              type="password"
              autoComplete="new-password"
              required={!agente.agenteId}
              label="API key OpenRouter"
              hint={
                agente.agenteId
                  ? "Vazio mantém a chave guardada."
                  : "Obrigatória na primeira configuração."
              }
              value={agente.chaveOpenRouter}
              onChange={(evento) => alterarAgente("chaveOpenRouter", evento.target.value)}
            />
          </div>
          <Checkbox
            label="Ativar agente agora — ele responderá novas mensagens deste canal"
            checked={agente.agenteAtivo}
            onChange={(evento) => alterarAgente("agenteAtivo", evento.target.checked)}
          />
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAberto(false)}
              disabled={enviando}
            >
              {resultado ? "Fechar" : "Cancelar"}
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
