import supabase from "../supabase";
import type { Evolucao } from "../../types";
import { valoresPacienteIdParaQuery } from "./paciente-id-query";
import { TABLES } from "./tables";

async function listEvolucoesPorPacienteComCoercao(
  _userId: string,
  pacienteId: string | number,
  order: { coluna: "data" | "id"; ascendente: boolean }
) {
  const candidatos = valoresPacienteIdParaQuery(pacienteId);
  const tentativas =
    candidatos.length > 0 ? candidatos : [pacienteId];

  // Não filtrar por user_id aqui: linhas antigas podem ter user_id null/errado.
  // O RLS (evolucoes via paciente) restringe o que o utilizador vê.
  let ultimo = await supabase
    .from(TABLES.EVOLUCOES)
    .select("*")
    .eq("paciente_id", tentativas[0]!)
    .order(order.coluna, { ascending: order.ascendente });

  if (ultimo.error) return ultimo;
  if ((ultimo.data?.length ?? 0) > 0) return ultimo;

  for (let i = 1; i < tentativas.length; i++) {
    const r = await supabase
      .from(TABLES.EVOLUCOES)
      .select("*")
      .eq("paciente_id", tentativas[i]!)
      .order(order.coluna, { ascending: order.ascendente });
    if (r.error) return r;
    if ((r.data?.length ?? 0) > 0) return r;
    ultimo = r;
  }

  return ultimo;
}

export async function listEvolucoesPorPaciente(
  userId: string,
  pacienteId: string | number
) {
  return listEvolucoesPorPacienteComCoercao(userId, pacienteId, {
    coluna: "data",
    ascendente: true,
  });
}

export async function listEvolucoesPorPacientePorId(
  userId: string,
  pacienteId: string | number
) {
  return listEvolucoesPorPacienteComCoercao(userId, pacienteId, {
    coluna: "data",
    ascendente: true,
  });
}

export async function listEvolucoesPorSessoes(
  _userId: string,
  sessaoIds: Array<string | number>
) {
  const ids = Array.from(
    new Set(
      sessaoIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    )
  );
  if (ids.length === 0) {
    return { data: [] as Evolucao[], error: null };
  }

  const CHUNK = 80;
  const todas: Evolucao[] = [];

  for (let i = 0; i < ids.length; i += CHUNK) {
    const pedaco = ids.slice(i, i + CHUNK);
    const res = await supabase
      .from(TABLES.EVOLUCOES)
      .select("*")
      .in("sessao_id", pedaco)
      .order("data", { ascending: true })
      .order("id", { ascending: true });

    if (res.error) {
      return { data: null, error: res.error };
    }

    todas.push(...((res.data || []) as Evolucao[]));
  }

  todas.sort((a, b) => {
    const da = String(a.data || "");
    const db = String(b.data || "");
    if (da !== db) return da.localeCompare(db);
    return Number(a.id) - Number(b.id);
  });

  return { data: todas, error: null };
}

export async function insertEvolucao(
  payload: Omit<Evolucao, "id">
) {
  return supabase.from(TABLES.EVOLUCOES).insert([payload]);
}

export async function updateEvolucao(
  _userId: string,
  id: string | number,
  payload: Partial<Evolucao>
) {
  const rest = { ...payload };
  delete rest.id;
  delete rest.user_id;

  return supabase
    .from(TABLES.EVOLUCOES)
    .update(rest)
    .eq("id", id);
}

export async function deleteAnotacoesSessao(
  _userId: string,
  sessaoId: string | number
) {
  return supabase
    .from(TABLES.EVOLUCOES)
    .delete()
    .eq("sessao_id", sessaoId)
    .eq("status_sessao", "anotacoes_sessao");
}

/** Remove todas as evoluções/anotações vinculadas à sessão antes de excluí-la. */
export async function deleteEvolucoesPorSessao(
  _userId: string,
  sessaoId: string | number
) {
  const ids = new Set<string | number>([sessaoId, String(sessaoId)]);
  const n = Number(sessaoId);
  if (Number.isFinite(n)) ids.add(n);

  return supabase
    .from(TABLES.EVOLUCOES)
    .delete()
    .in("sessao_id", [...ids]);
}
