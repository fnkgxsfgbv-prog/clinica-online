import type { Paciente } from "../../types";

export type ErroSupabase = { message?: string; code?: string; details?: string };

/** Erro PostgREST/PostgreSQL por coluna inexistente ou fora do schema cache. */
export function erroColunaInexistente(error: ErroSupabase | null | undefined) {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find")
  );
}

/** Extrai nome da coluna citada na mensagem de erro (quando possível). */
export function extrairColunaProblematica(error: ErroSupabase | null | undefined) {
  if (!error?.message) return null;
  const msg = error.message;

  const pgrst = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrst?.[1]) return pgrst[1];

  const pg = msg.match(/column\s+(?:[\w.]+\.)?(\w+)\s+does not exist/i);
  if (pg?.[1]) return pg[1];

  const quoted = msg.match(/column\s+"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];

  return null;
}

/** Campos só do TypeScript — nunca enviar ao Supabase. */
const CAMPOS_PACIENTE_TS = new Set(["valor"]);

/** Normaliza registro lido do banco (compat. `valor` legado → `valor_sessao`). */
export function normalizarPacienteDb(raw: Record<string, unknown>): Paciente {
  const paciente = { ...raw } as unknown as Paciente;
  if (
    (paciente.valor_sessao == null || String(paciente.valor_sessao).trim() === "") &&
    paciente.valor != null &&
    String(paciente.valor).trim() !== ""
  ) {
    paciente.valor_sessao = paciente.valor;
  }
  return paciente;
}

export function normalizarListaPacientesDb(
  registros: unknown[] | null | undefined
): Paciente[] {
  return (registros || []).map((item) =>
    normalizarPacienteDb(item as Record<string, unknown>)
  );
}

/** Remove aliases TS e campos vazios opcionais antes de insert/update. */
export function sanitizarPayloadPacienteDb(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(payload)) {
    if (CAMPOS_PACIENTE_TS.has(chave)) continue;
    if (chave === "id" || chave === "user_id") {
      out[chave] = valor;
      continue;
    }
    out[chave] = valor;
  }

  return out;
}

/**
 * Repete insert removendo colunas rejeitadas pelo schema (máx. 12 tentativas).
 * Útil em restore/criação quando o banco não tem migrations recentes.
 */
export async function insertComFallbackColunas<
  T extends Record<string, unknown>,
>(
  inserir: (payload: T) => PromiseLike<{ data: unknown; error: ErroSupabase | null }>,
  payload: T,
  maxTentativas = 12
) {
  let atual = { ...payload } as T;
  let ultimo: { data: unknown; error: ErroSupabase | null } = {
    data: null,
    error: null,
  };

  for (let i = 0; i < maxTentativas; i++) {
    ultimo = await inserir(atual);
    if (!ultimo.error) return ultimo;
    if (!erroColunaInexistente(ultimo.error)) return ultimo;

    const coluna = extrairColunaProblematica(ultimo.error);
    if (!coluna || !(coluna in atual)) return ultimo;

    const proximo = { ...atual };
    delete proximo[coluna];
    atual = proximo as T;
  }

  return ultimo;
}

/** Repete update removendo colunas rejeitadas pelo schema. */
export async function updateComFallbackColunas<
  T extends Record<string, unknown>,
>(
  atualizar: (payload: T) => PromiseLike<{ data: unknown; error: ErroSupabase | null }>,
  payload: T,
  maxTentativas = 12
) {
  return insertComFallbackColunas(atualizar, payload, maxTentativas);
}
