/** Isola a navegação de topo para permitir testar fluxos OAuth sem substituir window.location. */
export function navegarPara(url: string): void {
  window.location.assign(url);
}
