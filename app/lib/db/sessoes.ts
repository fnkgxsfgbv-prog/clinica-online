import supabase from "../supabase";
import type { Sessao } from "../../types";
import { dataReferenciaISO } from "../financeiro";
import { valoresPacienteIdParaQuery } from "./paciente-id-query";
import { TABLES } from "./tables";

export async function listSessoes(userId: string) {
  return supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .order("id", { ascending: true });
}

export async function listSessoesAgendadasFuturas(
  userId: string,
  hoje: string,
  horaAtual: string
) {
  return supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "Agendada")
    .or(`data.gt.${hoje},and(data.eq.${hoje},hora.gte.${horaAtual})`)
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .limit(8);
}

/** Todas as sessões de um dia (qualquer status), ordenadas por horário. */
export async function listSessoesDoDia(userId: string, dataIso: string) {
  const direto = await supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("user_id", userId)
    .eq("data", dataIso)
    .order("hora", { ascending: true })
    .order("id", { ascending: true });

  if (direto.error) return direto;
  if ((direto.data?.length ?? 0) > 0) return direto;

  // Fallback (para casos em que data vem como datetime/BR ou legado).
  const res = await listSessoes(userId);
  if (res.error) return res;

  const filtradas = (res.data || []).filter(
    (sessao) => dataReferenciaISO(sessao.data) === dataIso
  );

  filtradas.sort((a, b) => {
    const ha = String(a.hora || "");
    const hb = String(b.hora || "");
    return ha.localeCompare(hb) || String(a.id).localeCompare(String(b.id));
  });

  return { data: filtradas, error: null };
}

export async function listSessoesPorPaciente(
  _userId: string,
  pacienteId: string | number
) {
  const candidatos = valoresPacienteIdParaQuery(pacienteId);
  const tentativas =
    candidatos.length > 0 ? candidatos : [pacienteId];

  // Filtrar só por paciente_id; o RLS de sessoes (user_id) define o que entrega.
  let ultimo = await supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("paciente_id", tentativas[0]!)
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .order("id", { ascending: true });

  if (ultimo.error) return ultimo;
  if ((ultimo.data?.length ?? 0) > 0) return ultimo;

  for (let i = 1; i < tentativas.length; i++) {
    const r = await supabase
      .from(TABLES.SESSOES)
      .select("*")
      .eq("paciente_id", tentativas[i]!)
      .order("data", { ascending: true })
      .order("hora", { ascending: true })
      .order("id", { ascending: true });
    if (r.error) return r;
    if ((r.data?.length ?? 0) > 0) return r;
    ultimo = r;
  }

  return ultimo;
}

export async function getSessaoById(_userId: string, id: string | number) {
  const r1 = await supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (r1.error) return r1;
  if (r1.data) return r1;

  const n = Number(String(id).trim());
  if (!Number.isFinite(n) || String(n) === String(id)) return r1;

  return supabase.from(TABLES.SESSOES).select("*").eq("id", n).maybeSingle();
}

export async function corrigirUserIdSessao(
  userId: string,
  id: string | number
) {
  return supabase
    .from(TABLES.SESSOES)
    .update({ user_id: userId })
    .eq("id", id)
    .select("id");
}

export async function insertSessoes(
  sessoes: Array<Omit<Sessao, "id">>
) {
  return supabase.from(TABLES.SESSOES).insert(sessoes);
}

export async function updateSessao(
  userId: string,
  id: string | number,
  payload: Partial<Sessao>
) {
  const rest = { ...payload };
  delete rest.id;
  delete rest.user_id;

  return supabase
    .from(TABLES.SESSOES)
    .update(rest)
    .eq("user_id", userId)
    .eq("id", id);
}

export async function deleteSessao(_userId: string, id: string | number) {
  const res = await supabase
    .from(TABLES.SESSOES)
    .delete()
    .eq("id", id)
    .select("id");

  if (res.error) return res;

  if (!res.data?.length) {
    return {
      data: res.data,
      error: {
        message:
          "A sessão não foi excluída (não encontrada ou sem permissão). Atualize a página e tente de novo.",
        details: "",
        hint: "",
        code: "delete_no_rows",
      },
    };
  }

  return res;
}
