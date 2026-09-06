import { getSupabase } from "@/shared/supabase/client";
import { diasParado } from "../application/calcular-previsao";
import type { OperacaoAdminConsulta } from "../application/ports";
import type { Etapa } from "../domain/types";

const LIMIAR_INATIVO_DIAS = 21;
const LIMIAR_ETAPA_TRAVADA_MULTIPLICADOR = 3;

interface LinhaCliente {
  id: string;
  nome: string;
}
interface LinhaJornada {
  id: string;
  cliente_id: string;
}
interface LinhaFase {
  id: string;
  jornada_id: string;
}
interface LinhaEtapa {
  fase_id: string;
  titulo: string;
  responsavel: Etapa["responsavel"];
  status: Etapa["status"];
  prazo_medio_dias_uteis: number | null;
  desde_em: string | null;
}
interface LinhaEvento {
  cliente_id: string | null;
  ocorrido_em: string;
}

function paraEtapa(linha: LinhaEtapa): Etapa {
  return {
    id: linha.fase_id,
    titulo: linha.titulo,
    descricao: "",
    responsavel: linha.responsavel,
    status: linha.status,
    ...(linha.prazo_medio_dias_uteis ? { prazoMedioDiasUteis: linha.prazo_medio_dias_uteis } : {}),
    ...(linha.desde_em ? { desdeEm: linha.desde_em } : {}),
  };
}

/** Agregação pura: IDs UUID preservam relação entre jornada, fase, etapa e cliente. */
export function calcularOperacaoAdmin({
  clientes,
  jornadas,
  fases,
  etapas,
  eventosEntrada,
  agora = new Date(),
}: {
  clientes: LinhaCliente[];
  jornadas: LinhaJornada[];
  fases: LinhaFase[];
  etapas: LinhaEtapa[];
  eventosEntrada: LinhaEvento[];
  agora?: Date;
}) {
  const clientePorId = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]));
  const jornadaPorFase = new Map(
    fases.map((fase) => [fase.id, jornadas.find((jornada) => jornada.id === fase.jornada_id)]),
  );
  const ultimoEventoPorCliente = new Map<string, string>();
  for (const evento of eventosEntrada) {
    if (!evento.cliente_id) continue;
    const atual = ultimoEventoPorCliente.get(evento.cliente_id);
    if (!atual || evento.ocorrido_em > atual)
      ultimoEventoPorCliente.set(evento.cliente_id, evento.ocorrido_em);
  }

  const porGargalo = new Map<
    string,
    { titulo: string; responsavel: Etapa["responsavel"]; totalDias: number; casos: number }
  >();
  const alertas: {
    clienteId: string;
    clienteNome: string;
    tipo: "inatividade" | "etapa_travada";
    dias: number;
    etapaTitulo?: string;
  }[] = [];

  for (const jornada of jornadas) {
    const ultimoEvento = ultimoEventoPorCliente.get(jornada.cliente_id);
    if (ultimoEvento) {
      const dias = Math.max(
        0,
        Math.round((agora.getTime() - new Date(ultimoEvento).getTime()) / 86_400_000),
      );
      if (dias >= LIMIAR_INATIVO_DIAS) {
        alertas.push({
          clienteId: jornada.cliente_id,
          clienteNome: clientePorId.get(jornada.cliente_id) ?? "Cliente sem cadastro",
          tipo: "inatividade",
          dias,
        });
      }
    }
  }

  for (const linha of etapas) {
    const jornada = jornadaPorFase.get(linha.fase_id);
    if (!jornada) continue;
    const etapa = paraEtapa(linha);
    const dias = diasParado(etapa, agora);
    if (dias === 0) continue;

    const chave = `${etapa.titulo}:${etapa.responsavel}`;
    const gargalo = porGargalo.get(chave) ?? {
      titulo: etapa.titulo,
      responsavel: etapa.responsavel,
      totalDias: 0,
      casos: 0,
    };
    gargalo.totalDias += dias;
    gargalo.casos += 1;
    porGargalo.set(chave, gargalo);

    const limiar = (etapa.prazoMedioDiasUteis ?? 10) * LIMIAR_ETAPA_TRAVADA_MULTIPLICADOR;
    if (dias > limiar) {
      alertas.push({
        clienteId: jornada.cliente_id,
        clienteNome: clientePorId.get(jornada.cliente_id) ?? "Cliente sem cadastro",
        tipo: "etapa_travada",
        dias,
        etapaTitulo: etapa.titulo,
      });
    }
  }

  return {
    gargalos: [...porGargalo.values()]
      .map(({ totalDias, ...gargalo }) => ({
        ...gargalo,
        mediaDias: Math.round(totalDias / gargalo.casos),
      }))
      .sort((a, b) => b.mediaDias - a.mediaDias),
    alertas: alertas.sort((a, b) => b.dias - a.dias),
  };
}

/** Operação admin: todos dados vêm de tabelas normalizadas, sem seed local. */
export class SupabaseOperacaoAdminConsulta implements OperacaoAdminConsulta {
  async carregarAdmin() {
    const [clientes, jornadas, fases, etapas, eventosEntrada] = await Promise.all([
      getSupabase().schema("crm").from("clientes").select("id,nome"),
      getSupabase().schema("jornada").from("jornadas").select("id,cliente_id"),
      getSupabase().schema("jornada").from("fases").select("id,jornada_id"),
      getSupabase()
        .schema("jornada")
        .from("etapas")
        .select("fase_id,titulo,responsavel,status,prazo_medio_dias_uteis,desde_em"),
      getSupabase()
        .schema("comunicacao")
        .from("eventos")
        .select("cliente_id,ocorrido_em")
        .eq("direcao", "entrada"),
    ]);
    if (clientes.error) throw clientes.error;
    if (jornadas.error) throw jornadas.error;
    if (fases.error) throw fases.error;
    if (etapas.error) throw etapas.error;
    if (eventosEntrada.error) throw eventosEntrada.error;

    return calcularOperacaoAdmin({
      clientes: clientes.data as LinhaCliente[],
      jornadas: jornadas.data as LinhaJornada[],
      fases: fases.data as LinhaFase[],
      etapas: etapas.data as LinhaEtapa[],
      eventosEntrada: eventosEntrada.data as LinhaEvento[],
    });
  }
}
