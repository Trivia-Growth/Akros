/**
 * Flag de modo demo (E05-S01, AC-5). Nesta fase do projeto (protótipo visual mockado),
 * o padrão é sempre ligado. Defina VITE_DEMO_MODE=false no .env para desligar a barra de
 * demo quando a plataforma migrar para dados reais.
 */
export const isDemoMode: boolean = import.meta.env.VITE_DEMO_MODE !== "false";
