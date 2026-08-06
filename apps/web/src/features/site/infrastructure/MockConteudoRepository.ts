import { comLatencia, useMockDb } from "@/mocks/store";
import type { ConteudoRepository } from "../application/ports";
import type { Depoimento, PostBlog } from "../domain/types";

export class MockConteudoRepository implements ConteudoRepository {
  async listarPosts(): Promise<PostBlog[]> {
    return comLatencia(useMockDb.getState().posts);
  }

  async obterPostPorSlug(slug: string): Promise<PostBlog | null> {
    const post = useMockDb.getState().posts.find((p) => p.slug === slug) ?? null;
    return comLatencia(post);
  }

  async listarDepoimentos(): Promise<Depoimento[]> {
    return comLatencia(useMockDb.getState().depoimentos);
  }
}
