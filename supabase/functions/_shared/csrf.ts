// _shared/csrf.ts — defesa CSRF para endpoints autenticados por cookie (ADR-0008).
// Cookie SameSite=Strict já barra a origem cruzada; este header é a segunda camada: um
// formulário/fetch cross-site não consegue setar um header customizado sem CORS pré-aprovado.
import { HttpError } from "./auth.ts";

const HEADER = "X-Akros-Csrf";

export function requireCsrfHeader(req: Request): void {
  if (req.headers.get(HEADER) !== "1") {
    throw new HttpError(401, "Requisição sem proteção CSRF");
  }
}
