// _shared/erro-canal.ts — erro de negócio das APIs administrativas de canal (E13-S15): carrega o status
// HTTP, um código estável (a tela traduz) e uma mensagem segura. NUNCA o corpo nem a chave do provedor.
export class ErroCanal extends Error {
  constructor(public status: number, public codigo: string, mensagem: string) {
    super(mensagem);
  }
}
