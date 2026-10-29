import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  avaliarCompatibilidade,
  CAPACIDADES_OBRIGATORIAS,
  ESTADOS_CONEXAO,
  nomeDaInstancia,
  numerosIguais,
  telefoneCanonico,
  transicaoPermitida,
} from "./evolution-estado.ts";

Deno.test("versão fora da matriz é incompatível e diz o que fazer", () => {
  const r = avaliarCompatibilidade("2.9.9", null);
  assertEquals(r.compativel, false);
  assert(r.motivo?.includes("2.9.9") && r.motivo.includes("smoke"));
});

Deno.test("versão sem uma das capacidades obrigatórias é incompatível e lista a que falta", () => {
  const sem = CAPACIDADES_OBRIGATORIAS.filter((c) => c !== "qr");
  const r = avaliarCompatibilidade("2.3.7", { capacidades: sem });
  assertEquals(r.compativel, false);
  assert(r.motivo?.includes("qr"));
});

Deno.test("versão com as capacidades obrigatórias é compatível, mesmo sem envio provado (que só se prova pareado)", () => {
  assertEquals(avaliarCompatibilidade("2.3.7", { capacidades: [...CAPACIDADES_OBRIGATORIAS] }).compativel, true);
});

Deno.test("transições: não se chega a conectado sem passar por pareamento/desconexão", () => {
  assertEquals(transicaoPermitida("sem_credencial", "conectado_verificado"), false);
  assertEquals(transicaoPermitida("configuracao_incompleta", "conectado_verificado"), false);
  assertEquals(transicaoPermitida("aguardando_pareamento", "conectado_verificado"), true);
  assertEquals(transicaoPermitida("conectado_verificado", "desconectado"), true);
  assertEquals(transicaoPermitida("desconectado", "conectado_verificado"), true);
  // toda origem tem ao menos uma saída para erro (nada fica preso)
  for (const e of ESTADOS_CONEXAO) assert(transicaoPermitida(e, "erro"));
});

Deno.test("telefone canônico remove formatação e o nono dígito brasileiro", () => {
  assertEquals(telefoneCanonico("+55 (11) 98888-1001"), "551188881001");
  assertEquals(telefoneCanonico("551188881001"), "551188881001");
  assertEquals(telefoneCanonico("+1 202 555 0100"), "12025550100");
});

Deno.test("números iguais ignoram formatação e nono dígito; curtos ou diferentes não casam", () => {
  assert(numerosIguais("+55 11 98888-1001", "551188881001"));
  assert(!numerosIguais("+55 11 98888-1001", "+55 11 98888-1002"));
  assert(!numerosIguais("", ""));
  assert(!numerosIguais("123", "123"));
});

Deno.test("nome da instância é derivado do canal, sem hífen", () => {
  assertEquals(nomeDaInstancia("11111111-2222-4333-8444-555555555555"), "akros-111111112222433384445555");
});
