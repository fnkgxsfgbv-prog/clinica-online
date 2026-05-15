import supabase from "../supabase";
import type { Sessao } from "../../types";
import { TABLES } from "./tables";

export async function listSessoes(userId: string) {
  return supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: true });
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

export async function listSessoesPorPaciente(
  userId: string,
  pacienteId: string | number
) {
  return supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("user_id", userId)
    .eq("paciente_id", pacienteId)
    .order("id", { ascending: false });
}

export async function getSessaoById(userId: string, id: string | number) {
  return supabase
    .from(TABLES.SESSOES)
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
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
  const { id: _id, user_id: _userId, ...rest } = payload;

  return supabase
    .from(TABLES.SESSOES)
    .update(rest)
    .eq("user_id", userId)
    .eq("id", id);
}
