import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { executarManutencaoArquivos } from "./manutencao-arquivos.ts";

Deno.test("recupera leases e só limpa referência depois da remoção no Storage", async () => {
  const passos: string[] = [];
  await executarManutencaoArquivos({
    liberarLeases: () => { passos.push("leases"); return Promise.resolve(); },
    listarConfirmados: () => Promise.resolve([{ id: "1", caminho: "objeto-1" }]),
    removerObjeto: (caminho) => { passos.push(`storage:${caminho}`); return Promise.resolve(); },
    marcarLimpo: (id, caminho) => { passos.push(`banco:${id}:${caminho}`); return Promise.resolve(); },
  });
  assertEquals(passos, ["leases", "storage:objeto-1", "banco:1:objeto-1"]);
});

Deno.test("falha no Storage preserva referência e não impede limpeza dos demais", async () => {
  const apagados: string[] = [];
  await executarManutencaoArquivos({
    liberarLeases: () => Promise.resolve(),
    listarConfirmados: () => Promise.resolve([{ id: "1", caminho: "falha" }, { id: "2", caminho: "ok" }]),
    removerObjeto: (caminho) => caminho === "falha" ? Promise.reject(new Error("falha")) : Promise.resolve(),
    marcarLimpo: (id) => { apagados.push(id); return Promise.resolve(); },
  });
  assertEquals(apagados, ["2"]);
});
