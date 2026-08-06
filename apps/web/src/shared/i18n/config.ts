import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import adminEn from "./locales/en/admin.json";
import commonEn from "./locales/en/common.json";
import portalEn from "./locales/en/portal.json";
import siteEn from "./locales/en/site.json";
import adminPtBR from "./locales/pt-BR/admin.json";
import commonPtBR from "./locales/pt-BR/common.json";
import portalPtBR from "./locales/pt-BR/portal.json";
import sitePtBR from "./locales/pt-BR/site.json";

export const SUPPORTED_LANGUAGES = ["pt-BR", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const NAMESPACES = ["common", "site", "portal", "admin"] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-BR": { common: commonPtBR, site: sitePtBR, portal: portalPtBR, admin: adminPtBR },
      en: { common: commonEn, site: siteEn, portal: portalEn, admin: adminEn },
    },
    fallbackLng: "pt-BR",
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: NAMESPACES,
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "akros-language",
      caches: ["localStorage"],
    },
  });

export default i18n;
