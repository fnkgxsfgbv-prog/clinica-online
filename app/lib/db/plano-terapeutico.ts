import supabase from "../supabase";
import { TABLES } from "./tables";

export async function getPlanoTerapeuticoPorPaciente(
  userId: string,
  pacienteId: string | number
) {
  return supabase
    .from(TABLES.PACIENTE_PLANO_TERAPEUTICO)
    .select("*")
    .eq("user_id", userId)
    .eq("paciente_id", String(pacienteId))
    .maybeSingle();
}

export async function salvarPlanoTerapeuticoPaciente({
  userId,
  pacienteId,
  conteudo,
}: {
  userId: string;
  pacienteId: string | number;
  conteudo: string;
}) {
  const pacienteIdTexto = String(pacienteId);
  const existente = await getPlanoTerapeuticoPorPaciente(userId, pacienteIdTexto);

  if (existente.error) return existente;

  const agora = new Date().toISOString();

  if (existente.data) {
    const update = await supabase
      .from(TABLES.PACIENTE_PLANO_TERAPEUTICO)
      .update({
        conteudo,
        updated_at: agora,
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
    .from(TABLES.PACIENTE_PLANO_TERAPEUTICO)
    .insert([
      {
        user_id: userId,
        paciente_id: pacienteIdTexto,
        conteudo,
        updated_at: agora,
      },
    ])
    .select("*")
    .single();
}
