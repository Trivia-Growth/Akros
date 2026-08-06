import { container } from "@/app/di";
import { useEffect, useState } from "react";
import type { Depoimento, PostBlog } from "../domain/types";

export function useDepoimentos(): Depoimento[] {
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);

  useEffect(() => {
    container.conteudo.listarDepoimentos().then(setDepoimentos);
  }, []);

  return depoimentos;
}

export function usePosts(): PostBlog[] {
  const [posts, setPosts] = useState<PostBlog[]>([]);

  useEffect(() => {
    container.conteudo.listarPosts().then(setPosts);
  }, []);

  return posts;
}
