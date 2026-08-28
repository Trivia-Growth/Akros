import type { PapelAtivo } from "@/features/demo/application/useDemoSession";
import type { Lead } from "@/shared/contracts/lead";
import { leads as leadsSeed } from "./leads";
import type { MockDbSeed } from "./store";

export interface Cenario {
  id: string;
  nome: string;
  descricao: string;
  personaId?: string;
  papel: PapelAtivo;
  seedExtra?: () => Partial<MockDbSeed>;
}

const leadsExtrasFunilCheio: Lead[] = [
  {
    id: "lead-extra-1",
    nome: "Beatriz Amaral",
    email: "beatriz.amaral@example.com",
    telefone: "+55 11 90001-0001",
    origem: "Formulário homepage",
    tipoVistoInteresse: "EB-2 NIW",
    areaProfissao: "Farmacologia",
    estagio: "lead",
    criadoEm: "2026-08-05T08:00:00-03:00",
    notas: [],
  },
  {
    id: "lead-extra-2",
    nome: "Thiago Barros",
    email: "thiago.barros@example.com",
    telefone: "+55 21 90001-0002",
    origem: "Instagram",
    tipoVistoInteresse: "EB-1",
    areaProfissao: "Cinema",
    estagio: "lead",
    criadoEm: "2026-08-05T09:30:00-03:00",
    notas: [],
  },
  {
    id: "lead-extra-3",
    nome: "Larissa Melo",
    email: "larissa.melo@example.com",
    telefone: "+55 31 90001-0003",
    origem: "LinkedIn",
    tipoVistoInteresse: "EB-2 NIW",
    areaProfissao: "Arquitetura",
    estagio: "qualificado",
    criadoEm: "2026-08-02T10:00:00-03:00",
    notas: ["Perfil qualificado, aguardando reunião."],
  },
  {
    id: "lead-extra-4",
    nome: "Eduardo Pires",
    email: "eduardo.pires@example.com",
    telefone: "+55 41 90001-0004",
    origem: "Indicação",
    tipoVistoInteresse: "EB-2 NIW",
    areaProfissao: "Engenharia Mecânica",
    estagio: "em_negociacao",
    criadoEm: "2026-07-25T14:00:00-03:00",
    notas: ["Aguardando aprovação orçamentária do cliente."],
  },
];

export const cenarios: Cenario[] = [
  {
    id: "padrao",
    nome: "Padrão",
    descricao: "Estado inicial: 4 clientes em fases diferentes, funil variado de leads.",
    personaId: "cliente-carlos",
    papel: "cliente",
  },
  {
    id: "funil-cheio",
    nome: "Funil cheio",
    descricao: "Kanban de leads com volume alto em todas as 6 colunas. Visão do admin.",
    papel: "admin",
    seedExtra: () => ({ leads: [...leadsSeed, ...leadsExtrasFunilCheio] }),
  },
  {
    id: "recem-contratado",
    nome: "Cliente recém-contratado",
    descricao: "Carlos Mendes: introdução concluída, Fase 1 em andamento.",
    personaId: "cliente-carlos",
    papel: "cliente",
  },
  {
    id: "meio-processo",
    nome: "Cliente no meio do processo",
    descricao: "Renata Alves: Fase 2 em andamento, 1 pagamento em atraso.",
    personaId: "cliente-renata",
    papel: "cliente",
  },
  {
    id: "aguardando-uscis",
    nome: "Aguardando USCIS",
    descricao: "Bruno Castro: petição enviada, Fase 5 em acompanhamento pós-envio.",
    personaId: "cliente-bruno",
    papel: "cliente",
  },
  {
    id: "aprovado",
    nome: "Caso aprovado",
    descricao: "Fernanda Lima: jornada concluída, Green Card aprovado.",
    personaId: "cliente-fernanda",
    papel: "cliente",
  },
];
