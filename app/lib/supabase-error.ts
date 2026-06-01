type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

function limparMensagem(m?: string) {
  const t = String(m || "").trim();
  return t.length > 0 ? t : "Erro inesperado.";
}

/**
 * Mensagens curtas e úteis para erros comuns do Supabase/PostgREST.
 * Evita expor ruído técnico quando não ajuda.
 */
export function mensagemErroSupabase(
  acao: string,
  error: SupabaseLikeError
): string {
  if (!error) return `Erro ao ${acao}.`;

  const code = "code" in error ? String(error.code || "").trim() : "";
  const msg = "message" in error ? limparMensagem(error.message) : "Erro inesperado.";

  if (code === "PGRST116") {
    return `Não foi possível ${acao}: item não encontrado.`;
  }

  if (code === "42501" || /permission|not allowed|rls/i.test(msg)) {
    return `Sem permissão para ${acao}. Faça login novamente e tente de novo.`;
  }

  if (
    /null value in column/i.test(msg) ||
    /violates not-null constraint/i.test(msg)
  ) {
    return `Não foi possível ${acao}: falta um dado obrigatório. Atualize a página e tente novamente.`;
  }

  if (/Failed to fetch|NetworkError|timeout/i.test(msg)) {
    return `Erro de conexão ao ${acao}. Verifique sua internet e tente novamente.`;
  }

  return `Erro ao ${acao}: ${msg}`;
}

