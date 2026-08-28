import type { UsuarioAkros } from "@/features/configuracoes/domain/types";

/** Time interno da Akros — usado pra dono/compartilhamento de conta conectada (E04-S12). */
export const equipeAkros: UsuarioAkros[] = [
  {
    id: "usuario-natalia",
    nome: "Natalia Luz",
    cargo: "Fundadora",
    avatarUrl: "/equipe/natalia-luz.jpg",
  },
  {
    id: "usuario-bruno",
    nome: "Bruno Luz",
    cargo: "Sócio-fundador",
    avatarUrl: "/equipe/bruno-luz.jpg",
  },
  {
    id: "usuario-denise",
    nome: "Dra. Denise Sarchiapone",
    cargo: "Advogada responsável",
    avatarUrl: "/equipe/denise-sarchiapone.jpg",
  },
  {
    id: "usuario-elem",
    nome: "Elem Tluczek",
    cargo: "Case manager",
    avatarUrl: "/equipe/elem-tluczek.jpg",
  },
];
