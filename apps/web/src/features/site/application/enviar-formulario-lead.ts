import { container } from "@/app/di";
import type { Lead, NovoLead } from "@/shared/contracts/lead";
import { z } from "zod";

export const leadFormSchema = z.object({
  nome: z.string().trim().min(2, "form.requiredField"),
  email: z.string().trim().email("form.invalidEmail"),
  telefone: z.string().trim().min(8, "form.requiredField"),
  tipoVistoInteresse: z.string().min(1, "form.requiredField"),
  areaProfissao: z.string().optional(),
  mensagem: z.string().optional(),
  consentimento: z.literal(true, {
    errorMap: () => ({ message: "form.requiredField" }),
  }),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export async function enviarFormularioLead(input: LeadFormValues): Promise<Lead> {
  const novoLead: NovoLead = {
    nome: input.nome,
    email: input.email,
    telefone: input.telefone,
    tipoVistoInteresse: input.tipoVistoInteresse,
    areaProfissao: input.areaProfissao,
    mensagem: input.mensagem,
    origem: "Formulário homepage",
  };
  return container.leads.criar(novoLead);
}
