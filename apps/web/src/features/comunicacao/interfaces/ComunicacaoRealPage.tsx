import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { Badge, Card, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { CircleAlert, LockKeyhole, Mail, MessageCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useComunicacaoAdminSupabase } from "../application/useComunicacaoAdminSupabase";

/** Admin real: todas as coleções vêm do Supabase; envio e configuração aguardam fluxos seguros. */
export function ComunicacaoRealPage() {
  const { t } = useTranslation("admin");
  const { conversas, emails, eventos, agentes, fontes, carregando, erro } =
    useComunicacaoAdminSupabase();

  if (carregando) return <EstadoComunicacao mensagem="Carregando comunicação real…" />;
  if (erro) return <EstadoComunicacao mensagem="Não foi possível carregar comunicação." erro />;

  return (
    <div className="flex flex-col gap-6" data-testid="comunicacao-real">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{t("comunicacao.title")}</h1>
        <p className="text-sm text-ink-soft">{t("comunicacao.subtitle")}</p>
      </div>

      <Card className="flex gap-3 border-gold-200 bg-gold-50/45 text-sm text-ink-soft">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
        <p>
          Responder, enviar mídia, transcrever áudio e alterar agentes aguardam canais, arquivos e
          funções seguras. Esta tela não grava comunicação diretamente pelo navegador.
        </p>
      </Card>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">{t("comunicacao.tabInbox")}</TabsTrigger>
          <TabsTrigger value="email">E-mail</TabsTrigger>
          <TabsTrigger value="timeline">Histórico</TabsTrigger>
          <TabsTrigger value="agent">{t("comunicacao.tabAgent")}</TabsTrigger>
          <TabsTrigger value="knowledge">Base de conhecimento</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox">
          <ListaConversas conversas={conversas} />
        </TabsContent>
        <TabsContent value="email">
          <ListaEmails emails={emails} />
        </TabsContent>
        <TabsContent value="timeline">
          <Card>
            <Timeline eventos={eventos} emptyLabel="Nenhum evento real registrado ainda." />
          </Card>
        </TabsContent>
        <TabsContent value="agent">
          <ListaAgentes agentes={agentes} />
        </TabsContent>
        <TabsContent value="knowledge">
          <ListaFontes fontes={fontes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListaConversas({
  conversas,
}: { conversas: ReturnType<typeof useComunicacaoAdminSupabase>["conversas"] }) {
  if (conversas.length === 0)
    return <Card className="text-sm text-ink-muted">Nenhuma conversa real registrada ainda.</Card>;

  return (
    <div className="flex flex-col gap-3">
      {conversas.map((conversa) => {
        const ultima = conversa.mensagens.at(-1);
        return (
          <Card key={conversa.id} className="flex items-start gap-3" data-testid="conversa-real">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-navy">{conversa.clienteNome}</p>
                <Badge variant={conversa.atendidoPorIA ? "navy" : "neutral"}>
                  {conversa.atendidoPorIA ? "IA" : "Humano"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {conversa.canal} · {conversa.mensagens.length} mensagem(ns)
              </p>
              {ultima && (
                <p className="mt-2 truncate text-sm text-ink-soft">{ultima.texto || "Mídia"}</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ListaEmails({
  emails,
}: { emails: ReturnType<typeof useComunicacaoAdminSupabase>["emails"] }) {
  if (emails.length === 0)
    return <Card className="text-sm text-ink-muted">Nenhum e-mail real registrado ainda.</Card>;

  return (
    <div className="flex flex-col gap-3">
      {emails.map((email) => {
        const ultima = email.mensagens.at(-1);
        return (
          <Card key={email.id} className="flex items-start gap-3" data-testid="email-real">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-navy">{email.assunto}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {email.clienteNome ?? "Sem cliente vinculado"} · {email.mensagens.length}{" "}
                mensagem(ns)
              </p>
              {ultima && <p className="mt-2 truncate text-sm text-ink-soft">{ultima.corpo}</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ListaAgentes({
  agentes,
}: { agentes: ReturnType<typeof useComunicacaoAdminSupabase>["agentes"] }) {
  if (agentes.length === 0)
    return <Card className="text-sm text-ink-muted">Nenhum agente real configurado ainda.</Card>;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {agentes.map((agente) => (
        <Card key={agente.id} className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
          <div>
            <p className="text-sm font-medium text-navy">{agente.nome}</p>
            <p className="mt-1 text-xs text-ink-muted">{agente.funcao}</p>
            <Badge className="mt-2" variant={agente.ativo ? "success" : "neutral"}>
              {agente.ativo ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ListaFontes({
  fontes,
}: { fontes: ReturnType<typeof useComunicacaoAdminSupabase>["fontes"] }) {
  if (fontes.length === 0)
    return <Card className="text-sm text-ink-muted">Nenhuma fonte real cadastrada ainda.</Card>;

  return (
    <div className="flex flex-col gap-3">
      {fontes.map((fonte) => (
        <Card key={fonte.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-navy">{fonte.nome}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {fonte.tipo} · {fonte.itens} itens
            </p>
          </div>
          <Badge variant={fonte.status === "pronta" ? "success" : "gold"}>{fonte.status}</Badge>
        </Card>
      ))}
    </div>
  );
}

function EstadoComunicacao({ mensagem, erro = false }: { mensagem: string; erro?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-navy">Comunicação</h1>
      <Card className="flex items-center gap-3 text-sm text-ink-soft">
        <CircleAlert className={`h-4 w-4 ${erro ? "text-red-600" : "text-navy"}`} />
        {mensagem}
      </Card>
    </div>
  );
}
