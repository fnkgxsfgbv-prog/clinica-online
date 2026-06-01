import supabase from "../supabase";
import type { AnamneseCampo } from "../../types";
import { TABLES } from "./tables";

export type AnamnesePayload = {
  nome_formulario: string;
  campos: AnamneseCampo[];
};

export async function getAnamnesePorPaciente(
  userId: string,
  pacienteId: string | number
) {
  return supabase
    .from(TABLES.PACIENTE_ANAMNESE)
    .select("*")
    .eq("user_id", userId)
    .eq("paciente_id", String(pacienteId))
    .maybeSingle();
}

export async function salvarAnamnesePaciente({
  userId,
  pacienteId,
  payload,
}: {
  userId: string;
  pacienteId: string | number;
  payload: AnamnesePayload;
}) {
  const pacienteIdTexto = String(pacienteId);
  const existente = await getAnamnesePorPaciente(userId, pacienteIdTexto);

  if (existente.error) return existente;

  if (existente.data) {
    const update = await supabase
      .from(TABLES.PACIENTE_ANAMNESE)
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("paciente_id", pacienteIdTexto)
      .select("*");

    return {
      data: update.data?.[0] ?? null,
      error: update.error,
    };
  }

  return supabase
    .from(TABLES.PACIENTE_ANAMNESE)
    .insert([
      {
        ...payload,
        user_id: userId,
        paciente_id: pacienteIdTexto,
        updated_at: new Date().toISOString(),
      },
    ])
    .select("*")
    .single();
}
