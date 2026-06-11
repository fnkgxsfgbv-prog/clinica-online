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
  pdfStoragePath,
  pdfNomeArquivo,
  pdfImportadoEm,
}: {
  userId: string;
  pacienteId: string | number;
  conteudo: string;
  pdfStoragePath?: string | null;
  pdfNomeArquivo?: string | null;
  pdfImportadoEm?: string | null;
}) {
  const pacienteIdTexto = String(pacienteId);
  const existente = await getPlanoTerapeuticoPorPaciente(userId, pacienteIdTexto);

  if (existente.error) return existente;

  const agora = new Date().toISOString();
  const payload: Record<string, string | null> = {
    conteudo,
    updated_at: agora,
  };

  if (pdfStoragePath !== undefined) payload.pdf_storage_path = pdfStoragePath;
  if (pdfNomeArquivo !== undefined) payload.pdf_nome_arquivo = pdfNomeArquivo;
  if (pdfImportadoEm !== undefined) payload.pdf_importado_em = pdfImportadoEm;

  if (existente.data) {
    const update = await supabase
      .from(TABLES.PACIENTE_PLANO_TERAPEUTICO)
      .update(payload)
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
        pdf_storage_path: pdfStoragePath ?? null,
        pdf_nome_arquivo: pdfNomeArquivo ?? null,
        pdf_importado_em: pdfImportadoEm ?? null,
        updated_at: agora,
      },
    ])
    .select("*")
    .single();
}
