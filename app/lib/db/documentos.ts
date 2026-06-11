import supabase from "../supabase";
import type { PacienteDocumento } from "../../types";
import { TABLES } from "./tables";
import { mensagemErroSupabase } from "../supabase-error";

type SupabaseDbClient = Pick<typeof supabase, "from">;

export const PACIENTE_DOCUMENTOS_BUCKET = "paciente-documentos";
const MAX_DOCUMENTO_BYTES = 15 * 1024 * 1024; // 15MB

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

export async function listDocumentosPorPaciente(
  userId: string,
  pacienteId: string | number
) {
  return supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .select("*")
    .eq("user_id", userId)
    .eq("paciente_id", String(pacienteId))
    .order("created_at", { ascending: false });
}

export async function uploadDocumentoPaciente({
  userId,
  pacienteId,
  file,
}: {
  userId: string;
  pacienteId: string | number;
  file: File;
}) {
  if (!file) {
    return { data: null, error: new Error("Selecione um arquivo para enviar.") };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { data: null, error: new Error("Arquivo inválido ou vazio.") };
  }
  if (file.size > MAX_DOCUMENTO_BYTES) {
    return {
      data: null,
      error: new Error("Arquivo muito grande. Envie um arquivo de até 15MB."),
    };
  }
  const safeName = nomeArquivoSeguro(file.name);
  const storagePath = `${userId}/${String(pacienteId)}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (upload.error) {
    return {
      data: null,
      error: new Error(mensagemErroSupabase("enviar arquivo", upload.error)),
    };
  }

  const insert = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .insert([
      {
        user_id: userId,
        paciente_id: String(pacienteId),
        nome_arquivo: file.name,
        storage_path: storagePath,
        tipo_mime: file.type || null,
        tamanho_bytes: file.size,
      },
    ])
    .select("*")
    .single();

  if (insert.error) {
    await supabase.storage
      .from(PACIENTE_DOCUMENTOS_BUCKET)
      .remove([storagePath]);
    return {
      data: null,
      error: new Error(mensagemErroSupabase("salvar documento", insert.error)),
    };
  }

  return insert;
}

export async function salvarFormularioPdfDocumentoPaciente({
  userId,
  pacienteId,
  nomeArquivo,
  blob,
}: {
  userId: string;
  pacienteId: string | number;
  nomeArquivo: string;
  blob: Blob;
}) {
  const safeName = nomeArquivoSeguro(nomeArquivo);
  const storagePath = `${userId}/${String(pacienteId)}/${safeName}`;
  const contentType = "application/pdf";

  const upload = await supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType,
    });

  if (upload.error) return { data: null, error: upload.error };

  const existente = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .select("*")
    .eq("user_id", userId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existente.error) return { data: null, error: existente.error };

  if (existente.data) {
    const atualizado = await supabase
      .from(TABLES.PACIENTE_DOCUMENTOS)
      .update({
        nome_arquivo: nomeArquivo,
        tipo_mime: contentType,
        tamanho_bytes: blob.size,
      })
      .eq("user_id", userId)
      .eq("id", existente.data.id)
      .select("*")
      .single();

    return atualizado;
  }

  return supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .insert([
      {
        user_id: userId,
        paciente_id: String(pacienteId),
        nome_arquivo: nomeArquivo,
        storage_path: storagePath,
        tipo_mime: contentType,
        tamanho_bytes: blob.size,
      },
    ])
    .select("*")
    .single();
}

export async function salvarTextoComoDocumentoPaciente({
  userId,
  pacienteId,
  nomeArquivo,
  conteudo,
}: {
  userId: string;
  pacienteId: string | number;
  nomeArquivo: string;
  conteudo: string;
}) {
  const safeName = nomeArquivoSeguro(nomeArquivo);
  const storagePath = `${userId}/${String(pacienteId)}/${safeName}`;
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });

  const upload = await supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType: "text/plain;charset=utf-8",
    });

  if (upload.error) return { data: null, error: upload.error };

  const existente = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .select("*")
    .eq("user_id", userId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existente.error) return { data: null, error: existente.error };
  if (existente.data) return { data: existente.data, error: null };

  return supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .insert([
      {
        user_id: userId,
        paciente_id: String(pacienteId),
        nome_arquivo: nomeArquivo,
        storage_path: storagePath,
        tipo_mime: "text/plain",
        tamanho_bytes: blob.size,
      },
    ])
    .select("*")
    .single();
}

export async function salvarBlobComoDocumentoPaciente({
  userId,
  pacienteId,
  nomeArquivo,
  blob,
  contentType,
}: {
  userId: string;
  pacienteId: string | number;
  nomeArquivo: string;
  blob: Blob;
  contentType: string;
}) {
  const safeName = nomeArquivoSeguro(nomeArquivo);
  const storagePath = `${userId}/${String(pacienteId)}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

  if (upload.error) return { data: null, error: upload.error };

  const insert = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .insert([
      {
        user_id: userId,
        paciente_id: String(pacienteId),
        nome_arquivo: nomeArquivo,
        storage_path: storagePath,
        tipo_mime: contentType,
        tamanho_bytes: blob.size,
      },
    ])
    .select("*")
    .single();

  if (insert.error) {
    await supabase.storage
      .from(PACIENTE_DOCUMENTOS_BUCKET)
      .remove([storagePath]);
  }

  return insert;
}

export async function criarUrlDocumento(documento: PacienteDocumento) {
  return supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .createSignedUrl(documento.storage_path, 60 * 5);
}

export async function buscarBlobDocumento(documento: PacienteDocumento) {
  return supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .download(documento.storage_path);
}

export function documentoEhPdf(documento: PacienteDocumento) {
  const mime = (documento.tipo_mime || "").toLowerCase();
  const nome = (documento.nome_arquivo || "").toLowerCase();
  return mime.includes("pdf") || nome.endsWith(".pdf");
}

export function documentoEhImagem(documento: PacienteDocumento) {
  const mime = (documento.tipo_mime || "").toLowerCase();
  const nome = (documento.nome_arquivo || "").toLowerCase();
  return (
    mime.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nome)
  );
}

export async function criarUrlDownloadDocumento(documento: PacienteDocumento) {
  return supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .createSignedUrl(documento.storage_path, 60 * 5, {
      download: documento.nome_arquivo,
    });
}

export async function deleteDocumentoPaciente(
  userId: string,
  documento: PacienteDocumento
) {
  const deleteMetadata = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .delete()
    .eq("user_id", userId)
    .eq("id", documento.id);

  if (deleteMetadata.error) {
    return {
      data: null,
      error: new Error(mensagemErroSupabase("excluir documento", deleteMetadata.error)),
    };
  }

  await supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .remove([documento.storage_path]);

  return deleteMetadata;
}

export async function renameDocumentoPaciente(
  userId: string,
  documentoId: string | number,
  novoNomeArquivo: string
) {
  const nome = String(novoNomeArquivo || "").trim();
  if (!nome) {
    return {
      data: null,
      error: new Error("Informe um nome válido para o documento."),
    };
  }

  const res = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .update({ nome_arquivo: nome })
    .eq("user_id", userId)
    .eq("id", documentoId)
    .select("*")
    .single();

  if (res.error) {
    return {
      data: null,
      error: new Error(mensagemErroSupabase("renomear documento", res.error)),
    };
  }

  return res;
}

export async function substituirDocumentoPaciente({
  userId,
  documento,
  file,
}: {
  userId: string;
  documento: PacienteDocumento;
  file: File;
}) {
  if (!file) {
    return { data: null, error: new Error("Selecione um arquivo para substituir.") };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { data: null, error: new Error("Arquivo inválido ou vazio.") };
  }
  if (file.size > MAX_DOCUMENTO_BYTES) {
    return {
      data: null,
      error: new Error("Arquivo muito grande. Envie um arquivo de até 15MB."),
    };
  }
  const safeName = nomeArquivoSeguro(file.name);
  const storagePath = `${userId}/${String(documento.paciente_id)}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (upload.error) {
    return {
      data: null,
      error: new Error(mensagemErroSupabase("enviar arquivo", upload.error)),
    };
  }

  const update = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .update({
      nome_arquivo: file.name,
      storage_path: storagePath,
      tipo_mime: file.type || null,
      tamanho_bytes: file.size,
    })
    .eq("user_id", userId)
    .eq("id", documento.id)
    .select("*")
    .single();

  if (update.error) {
    await supabase.storage
      .from(PACIENTE_DOCUMENTOS_BUCKET)
      .remove([storagePath]);
    return {
      data: null,
      error: new Error(mensagemErroSupabase("atualizar documento", update.error)),
    };
  }

  // Best-effort cleanup of old object.
  if (documento.storage_path && documento.storage_path !== storagePath) {
    await supabase.storage
      .from(PACIENTE_DOCUMENTOS_BUCKET)
      .remove([documento.storage_path]);
  }

  return update;
}

/** Registra metadados de arquivo já enviado ao bucket (ex.: PDF do plano terapêutico). */
export async function registrarDocumentoPacienteExistente(
  client: SupabaseDbClient,
  {
    userId,
    pacienteId,
    nomeArquivo,
    storagePath,
    tipoMime,
    tamanhoBytes,
  }: {
    userId: string;
    pacienteId: string | number;
    nomeArquivo: string;
    storagePath: string;
    tipoMime?: string | null;
    tamanhoBytes?: number | null;
  }
) {
  const existente = await client
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .select("*")
    .eq("user_id", userId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existente.error) {
    return {
      data: null,
      error: new Error(mensagemErroSupabase("registrar documento", existente.error)),
    };
  }

  if (existente.data) {
    return { data: existente.data as PacienteDocumento, error: null };
  }

  const insert = await client
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .insert([
      {
        user_id: userId,
        paciente_id: String(pacienteId),
        nome_arquivo: nomeArquivo,
        storage_path: storagePath,
        tipo_mime: tipoMime || null,
        tamanho_bytes: tamanhoBytes ?? null,
      },
    ])
    .select("*")
    .single();

  if (insert.error) {
    return {
      data: null,
      error: new Error(mensagemErroSupabase("registrar documento", insert.error)),
    };
  }

  return { data: insert.data as PacienteDocumento, error: null };
}

/** Remove metadados de documento pelo caminho no storage (não apaga o arquivo). */
export async function removerDocumentoPorStoragePath(
  client: SupabaseDbClient,
  userId: string,
  storagePath: string
) {
  return client
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .delete()
    .eq("user_id", userId)
    .eq("storage_path", storagePath);
}
