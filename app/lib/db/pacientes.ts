import supabase from "../supabase";
import type { Paciente } from "../../types";
import { TABLES } from "./tables";

export async function listPacientes(userId: string) {
  return supabase
    .from(TABLES.PACIENTES)
    .select("*")
    .eq("user_id", userId)
    .order("nome", { ascending: true });
}

export async function getPacienteById(userId: string, id: string | number) {
  return supabase
    .from(TABLES.PACIENTES)
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
}

export async function createPaciente(
  userId: string,
  payload: Omit<Paciente, "id" | "user_id">
) {
  return supabase.from(TABLES.PACIENTES).insert([
    {
      ...payload,
      user_id: userId,
    },
  ]);
}

export async function updatePaciente(
  userId: string,
  id: string | number,
  payload: Partial<Paciente>
) {
  const { id: _id, user_id: _userId, ...rest } = payload;

  return supabase
    .from(TABLES.PACIENTES)
    .update(rest)
    .eq("user_id", userId)
    .eq("id", id);
}

export async function deletePacienteComDependencias(
  userId: string,
  id: string | number
) {
  await supabase
    .from(TABLES.FREQUENCIA)
    .delete()
    .eq("user_id", userId)
    .eq("paciente_id", id);

  await supabase
    .from(TABLES.SESSOES)
    .delete()
    .eq("user_id", userId)
    .eq("paciente_id", id);

  await supabase
    .from(TABLES.EVOLUCOES)
    .delete()
    .eq("user_id", userId)
    .eq("paciente_id", id);

  return supabase
    .from(TABLES.PACIENTES)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
}
