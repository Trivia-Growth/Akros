/**
 * E11-S03 — conteúdo dos 4 toques da cadência de follow-up. Cada toque oferece uma saída
 * diferente (nunca repete a cobrança anterior) — os textos abaixo são os mesmos exemplos que
 * o Bruno deu na mensagem de 06/08/2026.
 */
export interface ToqueCadencia {
  numero: number;
  diasAposUltimoContato: number;
  mensagem: string;
}

export const toquesCadenciaMock: ToqueCadencia[] = [
  {
    numero: 1,
    diasAposUltimoContato: 1,
    mensagem: "Oi! Conseguiu abrir o formulário que te enviei?",
  },
  {
    numero: 2,
    diasAposUltimoContato: 3,
    mensagem: "Se preferir, posso fazer as perguntas por aqui mesmo, sem precisar abrir o link.",
  },
  {
    numero: 3,
    diasAposUltimoContato: 7,
    mensagem: "Posso te ajudar em alguma dúvida antes de continuar?",
  },
  {
    numero: 4,
    diasAposUltimoContato: 14,
    mensagem: "Sem pressa. Prefere que eu entre em contato mais adiante?",
  },
];
