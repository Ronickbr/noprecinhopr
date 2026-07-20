export function getErrorMessage(e: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e instanceof Error) {
    const msg = e.message?.trim();
    if (!msg) return fallback;
    if (/forbidden/i.test(msg)) return "Você não tem permissão para essa ação.";
    if (/unauthorized/i.test(msg)) return "Sessão expirada. Faça login novamente.";
    if (/network|failed to fetch/i.test(msg)) return "Falha de conexão. Verifique sua internet.";
    if (/duplicate|unique/i.test(msg)) return "Já existe um registro com esses dados.";
    if (/violates row-level security/i.test(msg)) return "Ação bloqueada pelas regras de acesso.";
    return msg;
  }
  try { return JSON.stringify(e); } catch { return fallback; }
}
