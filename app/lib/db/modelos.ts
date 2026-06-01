import supabase from "../supabase";
import type {
  AnamneseCampo,
  DocumentoModelo,
  FormularioModelo,
  ModeloArquivo,
  PacienteFormulario,
} from "../../types";
import { TABLES } from "./tables";

export const MODELOS_ARQUIVOS_BUCKET = "modelos-arquivos";

type ModeloArquivoTipo = "documento" | "formulario";

function nomeArquivoSeguro(nome: string) {
  const partes = nome.split(".");
  const ext = partes.length > 1 ? `.${partes.pop()}` : "";
  const base = partes
    .join(".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return `${base || "arquivo"}${ext.toLowerCase()}`;
}

export function criarCamposDeTexto(conteudo: string): AnamneseCampo[] {
  return conteudo
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha, index) => {
      const partes = linha.split(/[;,]/).map((parte) => parte.trim());
      const titulo = partes[0] || `Pergunta ${index + 1}`;
      const placeholder = partes.slice(1).join(" ") || "Digite a resposta...";

      return {
        id: crypto.randomUUID(),
        titulo,
        placeholder,
        resposta: "",
      };
    });
}

export function normalizarCamposModelo(
  campos: AnamneseCampo[] | null | undefined
): AnamneseCampo[] {
  if (!Array.isArray(campos)) return [];

  return campos.map((campo) => ({
    id: campo.id || crypto.randomUUID(),
    titulo: campo.titulo || "Campo sem título",
    placeholder: campo.placeholder || "",
    resposta: campo.resposta || "",
  }));
}

export async function listDocumentoModelos(userId: string) {
  return supabase
    .from(TABLES.DOCUMENTO_MODELOS)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
}

export async function salvarDocumentoModelo({
  userId,
  modelo,
}: {
  userId: string;
  modelo: Partial<DocumentoModelo> & Pick<DocumentoModelo, "nome" | "conteudo">;
}) {
  const payload = {
    user_id: userId,
    nome: modelo.nome,
    categoria: modelo.categoria || "Documento",
    conteudo: modelo.conteudo,
    updated_at: new Date().toISOString(),
  };

  if (modelo.id) {
    const update = await supabase
      .from(TABLES.DOCUMENTO_MODELOS)
      .update(payload)
      .eq("user_id", userId)
      .eq("id", modelo.id)
      .select("*");

    return { data: update.data?.[0] ?? null, error: update.error };
  }

  return supabase
    .from(TABLES.DOCUMENTO_MODELOS)
    .insert([payload])
    .select("*")
    .single();
}

export async function deleteDocumentoModelo(userId: string, id: string | number) {
  return supabase
    .from(TABLES.DOCUMENTO_MODELOS)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
}

export async function listFormularioModelos(userId: string) {
  return supabase
    .from(TABLES.FORMULARIO_MODELOS)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
}

export async function salvarFormularioModelo({
  userId,
  modelo,
}: {
  userId: string;
  modelo: Partial<FormularioModelo> & Pick<FormularioModelo, "nome" | "campos">;
}) {
  const payload = {
    user_id: userId,
    nome: modelo.nome,
    descricao: modelo.descricao || null,
    campos: normalizarCamposModelo(modelo.campos),
    updated_at: new Date().toISOString(),
  };

  if (modelo.id) {
    const update = await supabase
      .from(TABLES.FORMULARIO_MODELOS)
      .update(payload)
      .eq("user_id", userId)
      .eq("id", modelo.id)
      .select("*");

    return { data: update.data?.[0] ?? null, error: update.error };
  }

  return supabase
    .from(TABLES.FORMULARIO_MODELOS)
    .insert([payload])
    .select("*")
    .single();
}

export async function deleteFormularioModelo(userId: string, id: string | number) {
  return supabase
    .from(TABLES.FORMULARIO_MODELOS)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
}

export async function uploadModeloArquivo({
  userId,
  tipo,
  file,
}: {
  userId: string;
  tipo: ModeloArquivoTipo;
  file: File;
}) {
  const safeName = nomeArquivoSeguro(file.name);
  const storagePath = `${userId}/${tipo}s/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from(MODELOS_ARQUIVOS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (upload.error) return { data: null, error: upload.error };

  const insert = await supabase
    .from(TABLES.MODELO_ARQUIVOS)
    .insert([
      {
        user_id: userId,
        tipo,
        nome_arquivo: file.name,
        storage_path: storagePath,
        tipo_mime: file.type || null,
        tamanho_bytes: file.size,
      },
    ])
    .select("*")
    .single();

  if (insert.error) {
    await supabase.storage.from(MODELOS_ARQUIVOS_BUCKET).remove([storagePath]);
  }

  return insert;
}

export async function listModeloArquivos(userId: string, tipo?: ModeloArquivoTipo) {
  let query = supabase
    .from(TABLES.MODELO_ARQUIVOS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);
  return query;
}

export async function criarUrlModeloArquivo(arquivo: ModeloArquivo) {
  return supabase.storage
    .from(MODELOS_ARQUIVOS_BUCKET)
    .createSignedUrl(arquivo.storage_path, 60 * 5);
}

export async function criarUrlDownloadModeloArquivo(arquivo: ModeloArquivo) {
  return supabase.storage
    .from(MODELOS_ARQUIVOS_BUCKET)
    .createSignedUrl(arquivo.storage_path, 60 * 5, {
      download: arquivo.nome_arquivo,
    });
}

export async function deleteModeloArquivo(userId: string, arquivo: ModeloArquivo) {
  const deleteMetadata = await supabase
    .from(TABLES.MODELO_ARQUIVOS)
    .delete()
    .eq("user_id", userId)
    .eq("id", arquivo.id);

  if (deleteMetadata.error) return deleteMetadata;

  await supabase.storage
    .from(MODELOS_ARQUIVOS_BUCKET)
    .remove([arquivo.storage_path]);

  return deleteMetadata;
}

export async function listPacienteFormularios(
  userId: string,
  pacienteId: string | number
) {
  return supabase
    .from(TABLES.PACIENTE_FORMULARIOS)
    .select("*")
    .eq("user_id", userId)
    .eq("paciente_id", String(pacienteId))
    .order("updated_at", { ascending: false });
}

export async function salvarPacienteFormulario({
  userId,
  pacienteId,
  formulario,
}: {
  userId: string;
  pacienteId: string | number;
  formulario: Partial<PacienteFormulario> &
    Pick<PacienteFormulario, "nome_formulario" | "campos">;
}) {
  const payload = {
    user_id: userId,
    paciente_id: String(pacienteId),
    modelo_id: formulario.modelo_id || null,
    nome_formulario: formulario.nome_formulario || "Formulário",
    campos: normalizarCamposModelo(formulario.campos),
    updated_at: new Date().toISOString(),
  };

  if (formulario.id) {
    const update = await supabase
      .from(TABLES.PACIENTE_FORMULARIOS)
      .update(payload)
      .eq("user_id", userId)
      .eq("id", formulario.id)
      .select("*");

    return { data: update.data?.[0] ?? null, error: update.error };
  }

  return supabase
    .from(TABLES.PACIENTE_FORMULARIOS)
    .insert([payload])
    .select("*")
    .single();
}

export async function deletePacienteFormulario(userId: string, id: string | number) {
  return supabase
    .from(TABLES.PACIENTE_FORMULARIOS)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
}
