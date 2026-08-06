import type { DadosRecebimento } from "@/features/pagamentos/domain/types";

/**
 * E10-S01 — sem gateway de pagamento: o cliente recebe estes dados e transfere por fora.
 * FICTÍCIOS. Nunca substituir por conta real da Akros neste protótipo.
 */
export const dadosRecebimentoPorMoeda: Record<"BRL" | "USD", DadosRecebimento> = {
  BRL: {
    moeda: "BRL",
    titular: "Akros Immigration Solutions LLC (fictício)",
    banco: "Banco Fictício S.A. (000)",
    agencia: "0001",
    conta: "12345-6",
    chavePix: "financeiro@akros-demo.example.com",
    instrucoes: "Use o ID do pagamento como referência na transferência ou no Pix.",
  },
  USD: {
    moeda: "USD",
    titular: "Akros Immigration Solutions LLC (fictício)",
    banco: "Fictional National Bank",
    routingNumber: "000000000",
    accountNumber: "0000123456789",
    swift: "FNBKUS00XXX",
    instrucoes: 'Use o ID do pagamento como referência ("memo") na transferência internacional.',
  },
};
