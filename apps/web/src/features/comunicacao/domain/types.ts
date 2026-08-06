export type CanalComunicacao = "whatsapp_oficial" | "evolution";
export type AutorMensagem = "cliente" | "agente_ia" | "humano";

export interface Mensagem {
  id: string;
  autor: AutorMensagem;
  texto: string;
  enviadoEm: string;
  lida: boolean;
}

export interface Conversa {
  id: string;
  clienteId: string;
  clienteNome: string;
  canal: CanalComunicacao;
  mensagens: Mensagem[];
  atendidoPorIA: boolean;
}

export interface RegraAtendimentoIA {
  ativo: boolean;
  nomeAgente: string;
  saudacao: string;
  janelasAtendimento: { inicio: string; fim: string }[];
  topicos: { pergunta: string; resposta: string }[];
  mensagemHandoff: string;
}
