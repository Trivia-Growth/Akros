import { ehFalhaDeChunk } from "@/shared/lib/carregar-com-retry";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "./Button";

interface Props {
  /** Nome da área para o usuário — "o painel admin", "a jornada". Aparece no fallback. */
  area: string;
  /** Rota conhecida como boa para onde voltar. */
  voltarPara: string;
  rotuloVoltar: string;
  children: ReactNode;
}

interface State {
  erro: Error | null;
  /** Trocar a chave remonta a subárvore — é o que faz "tentar de novo" funcionar de verdade. */
  chave: number;
}

/**
 * Fronteira de falha por rota (E15-S01, AC-2/AC-3).
 *
 * Precisa ficar **abaixo** do shell de navegação: um boundary só na raiz captura e some com a
 * árvore inteira, que é o comportamento que esta story existe para eliminar. Aqui só a área de
 * conteúdo é substituída — a barra lateral e o topo continuam vivos e navegáveis.
 *
 * Limite conhecido do React, registrado para não virar surpresa: `componentDidCatch` **não**
 * captura erro em handler assíncrono nem Promise rejeitada. Erro de I/O continua sendo
 * responsabilidade de quem chama a porta.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null, chave: 0 };

  static getDerivedStateFromError(erro: Error): Partial<State> {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // E16-S01 liga um sink aqui. Por enquanto o console é o único destino — e é melhor que
    // engolir: sem isto, a stack do que quebrou some junto com a tela.
    console.error(`[ErrorBoundary:${this.props.area}]`, erro, info.componentStack);
  }

  private tentarDeNovo = () => {
    this.setState((s) => ({ erro: null, chave: s.chave + 1 }));
  };

  render() {
    const { erro, chave } = this.state;
    if (!erro) return <div key={chave}>{this.props.children}</div>;

    const falhaDeChunk = ehFalhaDeChunk(erro);

    return (
      <div
        role="alert"
        className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-lg border border-border bg-white p-8"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-navy">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>

        <div className="space-y-1">
          <h1 className="font-serif text-xl text-navy">
            {falhaDeChunk
              ? "Esta parte não terminou de carregar"
              : `Algo quebrou em ${this.props.area}`}
          </h1>
          <p className="text-sm leading-relaxed text-navy/70">
            {falhaDeChunk
              ? "Normalmente é uma versão nova da plataforma que acabou de subir. Recarregar a página resolve."
              : "O restante da plataforma continua funcionando. Você pode tentar de novo ou seguir por outro caminho."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {falhaDeChunk ? (
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Recarregar a página
            </Button>
          ) : (
            <Button onClick={this.tentarDeNovo}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Tentar de novo
            </Button>
          )}
          <Link
            to={this.props.voltarPara}
            className="text-sm font-medium text-navy underline underline-offset-4 hover:text-gold"
          >
            {this.props.rotuloVoltar}
          </Link>
        </div>
      </div>
    );
  }
}
