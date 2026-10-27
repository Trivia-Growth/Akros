export function requisitosDaFase<T extends { faseTemplateId: string; ativo?: boolean }>(
  programa: { fasesTemplate: Array<{ id: string; ordem: number }>; documentosExigidos: T[] },
  fase: { ordem: number },
): T[] {
  const fases = programa.fasesTemplate.filter((item) => item.ordem === fase.ordem);
  if (fases.length !== 1) return [];
  return programa.documentosExigidos.filter(
    (item) => item.faseTemplateId === fases[0].id && item.ativo !== false,
  );
}
