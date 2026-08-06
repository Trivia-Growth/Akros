import { container } from "@/app/di";
import { calcularPrevisao } from "@/features/jornada/application/calcular-previsao";
import { instanciarJornada } from "@/features/jornada/application/instanciar-jornada";
import type { Jornada } from "@/features/jornada/domain/types";
import { programaEb2Niw, programaReligiosoREb4 } from "@/mocks/programas";
import { beforeEach, describe, expect, it } from "vitest";
import { useMockDb } from "./store";

describe("Rodada 2 — invariantes centrais (E06/E07/E08/E09/E11)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  describe("E06-S01 — Programa como dado versionado (ADR-0004)", () => {
    it("AC-2: fase 0 nasce liberada, as demais bloqueadas", () => {
      const jornada = instanciarJornada(programaEb2Niw, "cliente-x", "jornada-x");
      expect(jornada.fases[0].status).toBe("liberada");
      expect(jornada.fases.slice(1).every((f) => f.status === "bloqueada")).toBe(true);
    });

    it("AC-2/AC-3: jornada instanciada registra programaId e a versão congelada", () => {
      const jornada = instanciarJornada(programaReligiosoREb4, "cliente-x", "jornada-x");
      expect(jornada.programaId).toBe("religioso-r-eb4");
      expect(jornada.programaVersao).toBe(programaReligiosoREb4.versao);
    });

    it("AC-3: conversão de lead com programa explícito usa aquele catálogo, não o default", async () => {
      await container.leads.moverEstagio("lead-001", "fechado");
      const cliente = await container.clientes.criarAPartirDeLead("lead-001", "religioso-r-eb4");
      expect(cliente.programaId).toBe("religioso-r-eb4");

      const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === cliente.id);
      expect(jornada?.fases[0].id).toBe("rel-fase-0");
    });
  });

  describe("E07-S01 — Análise de documento nunca decide status (ADR-0005)", () => {
    it("AC-3: salvarAnaliseDocumento não muda Documento.status", () => {
      const antes = useMockDb.getState().documentos.find((d) => d.id === "doc-carlos-curriculo");
      expect(antes?.status).toBe("em_analise");

      useMockDb.getState().salvarAnaliseDocumento("doc-carlos-curriculo", {
        documentoId: "doc-carlos-curriculo",
        tipoDetectado: "curriculo",
        tipoEsperado: "curriculo",
        aderencia: "atende",
        confianca: 0.98,
        lacunas: [],
        sugestoes: [],
        analisadoEm: new Date().toISOString(),
        motor: "mock-regras@1",
      });

      const depois = useMockDb.getState().documentos.find((d) => d.id === "doc-carlos-curriculo");
      expect(depois?.status).toBe("em_analise");
      expect(depois?.analise?.aderencia).toBe("atende");
    });

    it("AC-4: mesmo documento produz sempre o mesmo parecer (determinístico)", async () => {
      const input = {
        documentoId: "doc-renata-carta-experiencia",
        tipoEsperado: "carta_experiencia" as const,
        objetivoRequisito: "Comprovar tempo de vínculo",
      };
      const primeira = await container.analiseDocumento.analisar(input);
      const segunda = await container.analiseDocumento.analisar(input);
      expect(segunda.aderencia).toBe(primeira.aderencia);
      expect(segunda.tipoDetectado).toBe(primeira.tipoDetectado);
      expect(segunda.confianca).toBe(primeira.confianca);
    }, 8000);

    it("E07-S04: troca entre carta de experiência e recomendação é detectada como tipo_incorreto", async () => {
      const analise = await container.analiseDocumento.analisar({
        documentoId: "doc-renata-carta-experiencia",
        tipoEsperado: "carta_experiencia",
        objetivoRequisito: "Comprovar tempo de vínculo",
      });
      expect(analise.aderencia).toBe("tipo_incorreto");
      expect(analise.tipoDetectado).toBe("carta_recomendacao");
    });

    it("decisão humana é a única que muda o status do documento", () => {
      useMockDb.getState().decidirDocumento("doc-carlos-curriculo", "aprovado", "Case manager");
      const doc = useMockDb.getState().documentos.find((d) => d.id === "doc-carlos-curriculo");
      expect(doc?.status).toBe("aprovado");
      expect(doc?.decisao?.autor).toBe("Case manager");
    });
  });

  describe("E08-S01 — Timeline unificada (ADR-0006)", () => {
    it("liberarFase registra evento de canal 'sistema' na timeline do cliente", async () => {
      await container.jornada.liberarFase("cliente-carlos", "fase-2");
      const timeline = await container.timeline.listarPorCliente("cliente-carlos");
      expect(timeline.some((e) => e.canal === "sistema")).toBe(true);
    });

    it("registrar/listar preserva ordem e conteúdo do evento", async () => {
      const evento = await container.timeline.registrar({
        clienteOuLeadId: "cliente-carlos",
        canal: "chat_portal",
        direcao: "entrada",
        autor: "Carlos Mendes",
        conteudo: "Olá, dúvida sobre o documento X",
        ocorridoEm: new Date().toISOString(),
      });
      const timeline = await container.timeline.listarPorCliente("cliente-carlos");
      expect(timeline.find((e) => e.id === evento.id)?.conteudo).toBe(
        "Olá, dúvida sobre o documento X",
      );
    });
  });

  describe("E09-S02 — Previsão pelo ritmo", () => {
    it("AC-3: com menos de 3 etapas concluídas com dados, usa fator de ritmo padrão (1.0)", () => {
      const jornada = instanciarJornada(programaEb2Niw, "cliente-x", "jornada-x");
      const previsao = calcularPrevisao(jornada);
      expect(previsao.dadosSuficientes).toBe(false);
      expect(previsao.fatorRitmo).toBe(1.0);
    });

    it("fator de ritmo > 1 quando o cliente demora mais que o prazo médio esperado", () => {
      const base = instanciarJornada(programaEb2Niw, "cliente-x", "jornada-x");
      const jornadaLenta: Jornada = {
        ...base,
        fases: base.fases.map((fase) => ({
          ...fase,
          etapas: fase.etapas.map((etapa) =>
            etapa.prazoMedioDiasUteis
              ? {
                  ...etapa,
                  status: "concluida" as const,
                  iniciadaEm: "2026-01-01T00:00:00-03:00",
                  concluidaRealEm: "2026-03-01T00:00:00-03:00",
                }
              : etapa,
          ),
        })),
      };
      const previsao = calcularPrevisao(jornadaLenta);
      expect(previsao.dadosSuficientes).toBe(true);
      expect(previsao.fatorRitmo).toBeGreaterThan(1);
    });
  });

  describe("E11-S03 — Cadência de follow-up", () => {
    it("AC-2: resposta do lead encerra a cadência ativa imediatamente", () => {
      useMockDb.getState().registrarToqueCadencia("lead-001");
      useMockDb.getState().registrarToqueCadencia("lead-001");
      expect(useMockDb.getState().leads.find((l) => l.id === "lead-001")?.cadencia?.status).toBe(
        "ativa",
      );

      useMockDb.getState().responderQualificacaoLead("lead-001", "nome", "Juliana Prado");

      const lead = useMockDb.getState().leads.find((l) => l.id === "lead-001");
      expect(lead?.cadencia?.status).toBe("encerrada");
      expect(lead?.cadencia?.motivoEncerramento).toBe("respondeu");
    });

    it("cadência se esgota após o 4º toque sem resposta", () => {
      for (let i = 0; i < 4; i++) {
        useMockDb.getState().registrarToqueCadencia("lead-002");
      }
      const lead = useMockDb.getState().leads.find((l) => l.id === "lead-002");
      expect(lead?.cadencia?.status).toBe("encerrada");
      expect(lead?.cadencia?.motivoEncerramento).toBe("esgotada");
    });
  });

  describe("E11-S04 — Gate humano de agendamento", () => {
    it("AC-2: bloqueia mover lead para 'reuniao_agendada' sem aprovação do gate", async () => {
      await container.leads.moverEstagio("lead-001", "reuniao_agendada");
      const lead = useMockDb.getState().leads.find((l) => l.id === "lead-001");
      expect(lead?.estagio).not.toBe("reuniao_agendada");
    });

    it("AC-3: aprovação do gate libera o agendamento", async () => {
      await container.leads.decidirGateAgendamento("lead-001", "aprovado", "Bruno Luz");
      await container.leads.moverEstagio("lead-001", "reuniao_agendada");
      const lead = useMockDb.getState().leads.find((l) => l.id === "lead-001");
      expect(lead?.estagio).toBe("reuniao_agendada");
    });

    it("AC-4: recusa registra motivo e move o lead para descartado (base de reativação)", async () => {
      await container.leads.decidirGateAgendamento(
        "lead-001",
        "recusado",
        "Bruno Luz",
        "Sem orçamento no momento",
      );
      const lead = useMockDb.getState().leads.find((l) => l.id === "lead-001");
      expect(lead?.estagio).toBe("descartado");
      expect(lead?.gateAgendamento?.motivoRecusa).toBe("Sem orçamento no momento");
    });
  });
});
