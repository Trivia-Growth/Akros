import {
  enviarFormularioLead,
  leadFormSchema,
} from "@/features/site/application/enviar-formulario-lead";
import { Button, Card, Checkbox, Input, Select, Textarea, toast } from "@/shared/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const TIPOS_VISTO = ["EB-2 NIW", "EB-1", "EB-2", "EB-3", "O-1", "H-1B", "L-1", "E-2", "Outro"];

interface FormState {
  nome: string;
  email: string;
  telefone: string;
  tipoVistoInteresse: string;
  areaProfissao: string;
  mensagem: string;
  consentimento: boolean;
}

const ESTADO_INICIAL: FormState = {
  nome: "",
  email: "",
  telefone: "",
  tipoVistoInteresse: "",
  areaProfissao: "",
  mensagem: "",
  consentimento: false,
};

export function LeadForm() {
  const { t } = useTranslation(["site", "common"]);
  const [values, setValues] = useState<FormState>(ESTADO_INICIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const result = leadFormSchema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormState;
        fieldErrors[field] = t(`common:${issue.message}`);
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await enviarFormularioLead(result.data);
      toast.success(t("common:form.success"));
      setValues(ESTADO_INICIAL);
      setEnviado(true);
    } catch {
      toast.error(t("common:form.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (enviado) {
    return (
      <Card className="text-center">
        <h3 className="font-display text-xl font-semibold text-navy">
          {t("site:contact.form.successTitle")}
        </h3>
        <p className="mt-2 text-sm text-ink-soft">{t("site:contact.form.successMessage")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => setEnviado(false)}>
          {t("common:actions.back")}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 font-display text-xl font-semibold text-navy">
        {t("site:contact.form.title")}
      </h3>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label={t("site:contact.form.name")}
          placeholder={t("site:contact.form.namePlaceholder")}
          value={values.nome}
          onChange={(e) => setField("nome", e.target.value)}
          error={errors.nome}
        />
        <Input
          type="email"
          label={t("site:contact.form.email")}
          placeholder={t("site:contact.form.emailPlaceholder")}
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          error={errors.email}
        />
        <Input
          type="tel"
          label={t("site:contact.form.phone")}
          placeholder={t("site:contact.form.phonePlaceholder")}
          value={values.telefone}
          onChange={(e) => setField("telefone", e.target.value)}
          error={errors.telefone}
        />
        <Select
          label={t("site:contact.form.visaType")}
          value={values.tipoVistoInteresse}
          onChange={(e) => setField("tipoVistoInteresse", e.target.value)}
          error={errors.tipoVistoInteresse}
        >
          <option value="" disabled>
            {t("site:contact.form.visaTypePlaceholder")}
          </option>
          {TIPOS_VISTO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </Select>
        <Input
          label={t("site:contact.form.profession")}
          placeholder={t("site:contact.form.professionPlaceholder")}
          value={values.areaProfissao}
          onChange={(e) => setField("areaProfissao", e.target.value)}
        />
        <Textarea
          label={t("site:contact.form.message")}
          placeholder={t("site:contact.form.messagePlaceholder")}
          value={values.mensagem}
          onChange={(e) => setField("mensagem", e.target.value)}
        />
        <Checkbox
          label={t("site:contact.form.consent")}
          checked={values.consentimento}
          onChange={(e) => setField("consentimento", e.target.checked)}
          error={errors.consentimento}
        />
        <Button type="submit" size="lg" loading={submitting} disabled={submitting}>
          {submitting ? t("site:contact.form.submitting") : t("site:contact.form.submit")}
        </Button>
      </form>
    </Card>
  );
}
