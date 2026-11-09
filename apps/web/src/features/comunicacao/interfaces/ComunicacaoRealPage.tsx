import { Timeline } from "@/features/comunicacao/interfaces/Timeline";
import { Badge, Button, Card, Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@/shared/ui";
import { CircleAlert, LockKeyhole, Mail, MessageCircle, Paperclip, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useComunicacaoAdminSupabase } from "../application/useComunicacaoAdminSupabase";
import type { Conversa, Mensagem } from "../domain/types";
import { PlaygroundAgente } from "./PlaygroundAgente";

/** Admin real: todas as coleções vêm do Supabase; envio e configuração aguardam fluxos seguros. */
export function ComunicacaoRealPage() {
  const { t } = useTranslation("admin");
  const { conversas, emails, eventos, agentes, fontes, carregando, erro, urlDoAnexo } =
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
          Responder, enviar mídia e transcrever áudio aguardam funções seguras. Esta tela não grava
          comunicação diretamente pelo navegador. Para configurar canais (Evolution, WhatsApp
          oficial, Instagram) e agentes, use{" "}
          <Link
            to="/admin/configuracoes"
            className="font-medium text-navy underline underline-offset-2"
            data-testid="atalho-configuracoes"
          >
            Configurações
          </Link>
          .
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
          <ListaConversas conversas={conversas} urlDoAnexo={urlDoAnexo} />
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
          <div className="flex flex-col gap-4">
            <ListaAgentes agentes={agentes} />
            <PlaygroundAgente agentes={agentes} />
          </div>
        </TabsContent>
        <TabsContent value="knowledge">
          <ListaFontes fontes={fontes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type AbrirAnexo = (caminho: string) => Promise<string>;

function ListaConversas({
  conversas,
  urlDoAnexo,
}: { conversas: Conversa[]; urlDoAnexo?: AbrirAnexo }) {
  if (conversas.length === 0)
    return <Card className="text-sm text-ink-muted">Nenhuma conversa real registrada ainda.</Card>;

  return (
    <div className="flex flex-col gap-3">
      {conversas.map((conversa) => (
        <CartaoConversa key={conversa.id} conversa={conversa} urlDoAnexo={urlDoAnexo} />
      ))}
    </div>
  );
}

function resumoDaMensagem(mensagem: Mensagem, t: (k: string) => string): string {
  if (mensagem.texto) return mensagem.texto;
  if (mensagem.anexo)
    return `${t("comunicacao.anexo.semTexto")}: ${mensagem.midiaNome ?? mensagem.anexo.mime}`;
  return "Mídia";
}

function CartaoConversa({ conversa, urlDoAnexo }: { conversa: Conversa; urlDoAnexo?: AbrirAnexo }) {
  const { t } = useTranslation("admin");
  const [aberta, setAberta] = useState(false);
  const ultima = conversa.mensagens.at(-1);
  const naoIdentificada = conversa.identificacao === "nao_identificada";

  return (
    <Card className="flex items-start gap-3" data-testid="conversa-real">
      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-navy">{conversa.clienteNome}</p>
          <div className="flex items-center gap-2">
            {naoIdentificada && <Badge variant="warning">{t("comunicacao.naoIdentificada")}</Badge>}
            <Badge variant={conversa.atendidoPorIA ? "navy" : "neutral"}>
              {conversa.atendidoPorIA ? "IA" : "Humano"}
            </Badge>
          </div>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {conversa.canal} · {conversa.mensagens.length} mensagem(ns)
        </p>
        {naoIdentificada && (
          <p className="mt-1 text-xs text-amber-700">{t("comunicacao.naoIdentificadaAjuda")}</p>
        )}
        {ultima && (
          <p className="mt-2 truncate text-sm text-ink-soft">{resumoDaMensagem(ultima, t)}</p>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 px-0"
          aria-expanded={aberta}
          onClick={() => setAberta((v) => !v)}
        >
          {aberta ? t("comunicacao.ocultarMensagens") : t("comunicacao.verMensagens")}
        </Button>
        {aberta && (
          <ul
            className="mt-2 flex flex-col gap-2 border-t border-border pt-3"
            data-testid="mensagens-da-conversa"
          >
            {conversa.mensagens.map((mensagem) => (
              <LinhaMensagem key={mensagem.id} mensagem={mensagem} urlDoAnexo={urlDoAnexo} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function LinhaMensagem({ mensagem, urlDoAnexo }: { mensagem: Mensagem; urlDoAnexo?: AbrirAnexo }) {
  const { t } = useTranslation("admin");
  const anexo = mensagem.anexo;

  async function abrir() {
    if (!anexo?.caminho || !urlDoAnexo) return;
    try {
      const url = await urlDoAnexo(anexo.caminho);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("comunicacao.anexo.erroAbrir"));
    }
  }

  return (
    <li className="text-sm">
      <p className="text-xs text-ink-muted">
        {t(`comunicacao.autor.${mensagem.autor}`)} · {new Date(mensagem.enviadoEm).toLocaleString()}
      </p>
      {mensagem.texto && <p className="whitespace-pre-wrap text-ink-soft">{mensagem.texto}</p>}
      {anexo?.transcricao?.estado === "concluida" && (
        <p className="mt-0.5 text-xs italic text-ink-muted">
          {t("comunicacao.transcricao.concluida")}
        </p>
      )}
      {anexo?.transcricao?.estado === "falhou" && (
        <Badge variant="warning" className="mt-1">
          {t("comunicacao.transcricao.falhou")}
          {anexo.transcricao.motivo
            ? ` · ${t(`comunicacao.transcricao.motivos.${anexo.transcricao.motivo}`, { defaultValue: anexo.transcricao.motivo })}`
            : ""}
        </Badge>
      )}
      {anexo && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <Paperclip className="h-3.5 w-3.5 text-navy" aria-hidden />
          <span className="text-ink-soft">{mensagem.midiaNome ?? anexo.mime}</span>
          {anexo.baixado && anexo.caminho ? (
            <Button size="sm" variant="secondary" onClick={abrir}>
              {t("comunicacao.anexo.abrir")}
            </Button>
          ) : (
            <Badge variant="warning">
              {t("comunicacao.anexo.indisponivel")}
              {anexo.motivo ? ` · ${t(`comunicacao.anexo.${anexo.motivo}`)}` : ""}
            </Badge>
          )}
        </div>
      )}
    </li>
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
    return (
      <Card className="text-sm text-ink-muted">
        Nenhum agente real configurado ainda. <LinkConfigurarAgente />
      </Card>
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Aqui só se vê o estado dos agentes. <LinkConfigurarAgente />
      </p>
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
    </div>
  );
}

function LinkConfigurarAgente() {
  return (
    <Link
      to="/admin/configuracoes"
      className="font-medium text-navy underline underline-offset-2"
      data-testid="atalho-configurar-agente"
    >
      Configurar canal e agente em Configurações
    </Link>
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
