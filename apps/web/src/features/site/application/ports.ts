import type { NovoLead } from "@/shared/contracts/lead";
import type { Depoimento, PostBlog } from "../domain/types";

export interface ConteudoRepository {
  listarPosts(): Promise<PostBlog[]>;
  obterPostPorSlug(slug: string): Promise<PostBlog | null>;
  listarDepoimentos(): Promise<Depoimento[]>;
}

/** Reexport de conveniência — `site` consome LeadRepository (definido em shared/contracts). */
export type { NovoLead };
