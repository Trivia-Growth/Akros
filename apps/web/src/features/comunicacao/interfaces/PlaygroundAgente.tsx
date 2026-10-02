import { erroDetalhado } from "@/shared/lib/http/edge-function-error";
import { getSupabase } from "@/shared/supabase/client";
import { Badge, Button, Card, Select, Textarea } from "@/shared/ui";
import { Bot, FlaskConical, RotateCcw, Send, UserRound } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  type MensagemTeste,
  type RespostaPlayground,
  SUGESTOES,
  corpoPlayground,
  custoFormatado,
  duracaoFormatada,
} from "../application/playground";
import type { ResumoAgenteIA } from "../application/ports";

let sequencia = 0;
const proximoId = () => `teste-${++sequencia}`;

/**
 * Conversa de teste com o agente, sem canal e sem gravar nada. Chama a Edge Function
 * `agente-playground`, que roda a mesma decisão da produção (encaminhar à equipe ou responder pela IA).
 * A conversa existe só nesta tela: recarregar ou "Nova conversa" apaga.
 */
export function PlaygroundAgente({ agentes }: { agentes: ResumoAgenteIA[] }) {
  const [agenteId, setAgenteId] = useState(agentes[0]?.id ?? "");
  const [mensagens, setMensagens] = useState<MensagemTeste[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [instrucoes, setInstrucoes] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  // `scrollIntoView` não existe no jsdom dos testes; no navegador sempre existe.
  useEffect(() => {
    if (mensagens.length > 0) fim.current?.scrollIntoView?.({ block: "end" });
  }, [mensagens.length]);

  function novaConversa() {
    setMensagens([]);
    setErro(null);
    setInstrucoes(null);
  }

  async function enviar(texto: string) {
    const limpo = texto.trim();
    if (!limpo || enviando || !agenteId) return;
    const historico = mensagens;
    setErro(null);
    setEnviando(true);
    setRascunho("");
    setMensagens([...historico, { id: proximoId(), autor: "cliente", texto: limpo }]);
    try {
      const { data, error } = await getSupabase().functions.invoke("agente-playground", {
        headers: { "x-akros-csrf": "1" },
        body: corpoPlayground(agenteId, historico, limpo),
      });
      if (error) throw await erroDetalhado(error);
      const r = data as RespostaPlayground;
      setInstrucoes(r.instrucoes);
      setMensagens((atual) => [
        ...atual,
        {
          id: proximoId(),
          autor: "agente_ia",
          texto: r.resposta,
          meta: { tipo: r.tipo, modelo: r.modelo, ms: r.ms, custo: r.custo },
        },
      ]);
    } catch (causa) {
      // A mensagem não foi respondida: sai da conversa e volta para o campo, para tentar de novo.
      setMensagens(historico);
      setRascunho(limpo);
      setErro(causa instanceof Error ? causa.message : "Não foi possível testar agora.");
    } finally {
      setEnviando(false);
    }
  }

  function aoTeclar(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      void enviar(rascunho);
    }
  }

  if (agentes.length === 0) {
    return (
      <Card className="text-sm text-ink-muted" data-testid="playground-sem-agente">
        Para usar o Playground, salve um agente primeiro (Configurações → Configurar agente e canal,
        sem precisar conectar canal).
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4" data-testid="playground-agente">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy">
            <FlaskConical className="h-4 w-4 text-gold-700" aria-hidden />
            Playground do agente
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Converse como se fosse um cliente. Nada é gravado nem enviado a ninguém. Usa a mesma
            lógica da produção, mas gasta crédito da sua chave OpenRouter.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={novaConversa}
          disabled={enviando}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Nova conversa
        </Button>
      </div>

      <div className="rounded-lg bg-cream-100 px-3 py-2.5 text-xs text-ink-soft">
        O agente conhece só o texto de <strong>Orientação e tom</strong> (Configurações) e a
        conversa. A base de conhecimento ainda não é consultada: o que ele errar por falta de
        informação, coloque na orientação e teste de novo.
      </div>

      <Select label="Agente" value={agenteId} onChange={(e) => setAgenteId(e.target.value)}>
        {agentes.map((agente) => (
          <option key={agente.id} value={agente.id}>
            {agente.nome}
            {agente.ativo ? "" : " (desligado)"}
          </option>
        ))}
      </Select>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversa de teste"
        className="flex max-h-[28rem] min-h-40 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-white p-3"
        data-testid="playground-conversa"
      >
        {mensagens.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nenhuma mensagem ainda. Escreva abaixo ou use uma das sugestões.
          </p>
        ) : (
          mensagens.map((m) => <Balao key={m.id} mensagem={m} />)
        )}
        {enviando ? <p className="text-xs text-ink-muted">O agente está respondendo…</p> : null}
        <div ref={fim} />
      </div>

      {erro ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" aria-label="Sugestões de mensagem">
        {SUGESTOES.map((sugestao) => (
          <button
            key={sugestao}
            type="button"
            disabled={enviando}
            onClick={() => void enviar(sugestao)}
            className="rounded-full border border-border bg-cream-50 px-3 py-1 text-xs text-ink-soft transition hover:border-gold-400 hover:text-navy disabled:opacity-50"
          >
            {sugestao}
          </button>
        ))}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar(rascunho);
        }}
      >
        <div className="flex-1">
          <Textarea
            label="Mensagem do cliente"
            rows={2}
            maxLength={2000}
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={aoTeclar}
            hint="Enter envia; Shift+Enter quebra a linha."
          />
        </div>
        <Button type="submit" loading={enviando} disabled={!rascunho.trim()}>
          <Send className="h-4 w-4" aria-hidden />
          Enviar
        </Button>
      </form>

      {instrucoes ? (
        <details
          className="rounded-lg border border-border px-3 py-2 text-sm"
          data-testid="playground-instrucoes"
        >
          <summary className="cursor-pointer font-medium text-navy">
            Instruções que o modelo recebe
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-ink-soft">
            {instrucoes}
          </pre>
        </details>
      ) : null}
    </Card>
  );
}

function Balao({ mensagem }: { mensagem: MensagemTeste }) {
  const doCliente = mensagem.autor === "cliente";
  const custo = mensagem.meta ? custoFormatado(mensagem.meta.custo) : null;
  return (
    <div
      className={`flex gap-2 ${doCliente ? "flex-row-reverse" : ""}`}
      data-testid={doCliente ? "msg-cliente" : "msg-agente"}
    >
      {doCliente ? (
        <UserRound className="mt-1 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
      ) : (
        <Bot className="mt-1 h-4 w-4 shrink-0 text-gold-700" aria-hidden />
      )}
      <div className={`max-w-[85%] ${doCliente ? "text-right" : ""}`}>
        <p
          className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
            doCliente ? "bg-navy text-white" : "bg-cream-100 text-ink"
          }`}
        >
          {mensagem.texto}
        </p>
        {mensagem.meta ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            {mensagem.meta.tipo === "handoff" ? (
              <Badge variant="gold">Encaminhado à equipe · a IA não foi chamada</Badge>
            ) : null}
            {mensagem.meta.modelo ? <span>{mensagem.meta.modelo}</span> : null}
            <span>{duracaoFormatada(mensagem.meta.ms)}</span>
            {custo ? <span>{custo}</span> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
