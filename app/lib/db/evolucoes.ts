import supabase from "../supabase";
import type { Evolucao } from "../../types";
import { TABLES } from "./tables";

export async function listEvolucoesPorPaciente(
  userId: string,
  pacienteId: string | number
) {
  return supabase
    .from(TABLES.EVOLUCOES)
    .select("*")
    .eq("user_id", userId)
    .eq("paciente_id", pacienteId)
    .order("data", { ascending: false });
}

export async function listEvolucoesPorPacientePorId(
  userId: string,
  pacienteId: string | number
) {
  return supabase
    .from(TABLES.EVOLUCOES)
    .select("*")
    .eq("user_id", userId)
    .eq("paciente_id", pacienteId)
    .order("id", { ascending: false });
}

export async function insertEvolucao(
  payload: Omit<Evolucao, "id">
) {
  return supabase.from(TABLES.EVOLUCOES).insert([payload]);
}
