// _shared/canais/evolution-url.ts — validação do endereço do servidor Evolution (E13-S15, FR-002).
// A URL vem de um formulário de administrador, mas as Edge Functions a chamam com a chave do
// servidor: sem esta barreira, ela vira um SSRF para a rede interna do projeto. Falha fechada.
//
// Regras: HTTPS; sem usuário/senha, consulta ou fragmento; sem localhost/loopback/rede privada/
// link-local/endereço de metadados; nome de host precisa resolver SÓ para endereços públicos; a
// resolução é refeita a cada chamada externa (DNS rebinding) e redirecionamento é recusado pelo
// cliente (`redirect: "error"`).

export interface ResultadoUrl {
  valida: boolean;
  motivo?: string;
}

export interface OpcoesUrl {
  /** Resolve A/AAAA do host. Ausente para nome de host ⇒ recusa ("resolução segura obrigatória"). */
  resolverEnderecos?: (host: string) => Promise<string[]>;
}

const REDES_NEGADAS: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
];

function ipv4ParaInteiro(ip: string): number | null {
  const partes = ip.split(".").map(Number);
  if (partes.length !== 4 || partes.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((partes[0] << 24) | (partes[1] << 16) | (partes[2] << 8) | partes[3]) >>> 0;
}

const ehIpv4 = (valor: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(valor);

export function ipv4Bloqueado(ip: string): boolean {
  const valor = ipv4ParaInteiro(ip);
  if (valor === null) return false;
  return REDES_NEGADAS.some(([base, prefixo]) => {
    const baseValor = ipv4ParaInteiro(base);
    if (baseValor === null) return false;
    const mascara = prefixo === 0 ? 0 : (0xffffffff << (32 - prefixo)) >>> 0;
    return (valor & mascara) === (baseValor & mascara);
  });
}

export function ipv6Bloqueado(ip: string): boolean {
  const n = ip.toLowerCase().replace(/^\[|\]$/g, "");
  // ::ffff:a.b.c.d ou ::ffff:aabb:ccdd (IPv4 mapeado)
  const mapeadoPontuado = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(n);
  if (mapeadoPontuado) return ipv4Bloqueado(mapeadoPontuado[1]);
  const mapeado = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(n);
  if (mapeado) {
    const alto = Number.parseInt(mapeado[1], 16);
    const baixo = Number.parseInt(mapeado[2], 16);
    return ipv4Bloqueado(`${alto >> 8}.${alto & 255}.${baixo >> 8}.${baixo & 255}`);
  }
  return (
    n === "::1" ||
    n === "::" ||
    n.startsWith("fc") ||
    n.startsWith("fd") ||
    /^fe[89ab]/.test(n) ||
    n.startsWith("ff") ||
    n.startsWith("2001:db8:")
  );
}

function hostPorNome(host: string): boolean {
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    host.endsWith(".internal") || host.endsWith(".lan");
}

export async function validarUrlServidor(bruta: string, opcoes: OpcoesUrl = {}): Promise<ResultadoUrl> {
  let url: URL;
  try {
    url = new URL(bruta);
  } catch {
    return { valida: false, motivo: "URL inválida." };
  }
  if (url.protocol !== "https:") return { valida: false, motivo: "A URL precisa ser HTTPS." };
  if (url.username !== "" || url.password !== "") {
    return { valida: false, motivo: "A URL não pode conter usuário ou senha." };
  }
  if (url.search !== "" || url.hash !== "") {
    return { valida: false, motivo: "A URL não pode conter consulta nem fragmento." };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostPorNome(host)) return { valida: false, motivo: "Endereço local não é permitido." };
  if (ehIpv4(host)) {
    return ipv4Bloqueado(host)
      ? { valida: false, motivo: "Endereço privado ou local não é permitido." }
      : { valida: true };
  }
  if (host.includes(":")) {
    return ipv6Bloqueado(host)
      ? { valida: false, motivo: "Endereço privado ou local não é permitido." }
      : { valida: true };
  }

  if (!opcoes.resolverEnderecos) return { valida: false, motivo: "Resolução segura obrigatória." };
  try {
    const enderecos = await opcoes.resolverEnderecos(host);
    if (enderecos.length === 0) return { valida: false, motivo: "O servidor não resolve para nenhum endereço." };
    for (const endereco of enderecos) {
      const bloqueado = ehIpv4(endereco) ? ipv4Bloqueado(endereco) : ipv6Bloqueado(endereco);
      if (bloqueado) return { valida: false, motivo: "O nome do servidor resolve para rede privada." };
    }
  } catch {
    return { valida: false, motivo: "Não foi possível resolver o endereço do servidor." };
  }
  return { valida: true };
}

/** Resolve A e AAAA a cada chamada; ausência total falha fechado. */
export async function resolverEnderecosPublicos(host: string): Promise<string[]> {
  const resultados = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
  const enderecos = resultados.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (enderecos.length === 0) throw new Error("dns_sem_endereco");
  return enderecos;
}

/** `https://host/prefixo/` ⇒ `https://host/prefixo` (sem barra final). Só após `validarUrlServidor`. */
export function urlBaseNormalizada(bruta: string): string {
  const url = new URL(bruta);
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}
