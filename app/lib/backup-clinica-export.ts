import {
  BACKUP_ARQUIVO_MAX_BYTES,
  blobParaBase64,
  montarBackupClinicaV2,
  refArquivoDocumento,
  refArquivoModelo,
  type BackupArquivoEmbutido,
  type BackupClinicaPayload,
  type BackupClinicaPerfil,
} from "./backup-clinica";
import {
  buscarBlobDocumento,
  listDocumentosPorPaciente,
  PACIENTE_DOCUMENTOS_BUCKET,
} from "./db/documentos";
import {
  listDocumentoModelos,
  listFormularioModelos,
  listModeloArquivos,
  listPacienteFormularios,
  MODELOS_ARQUIVOS_BUCKET,
} from "./db/modelos";
import { listFrequenciasResumo } from "./db/frequencia";
import { listPacientes } from "./db/pacientes";
import { listSessoes } from "./db/sessoes";
import { TABLES } from "./db/tables";
import supabase from "./supabase";
import type {
  DocumentoModelo,
  Evolucao,
  FormularioModelo,
  Frequencia,
  ModeloArquivo,
  Paciente,
  PacienteAnamnese,
  PacienteDocumento,
  PacienteFormulario,
  Sessao,
} from "../types";

export type ProgressoBackupClinica = {
  etapa: string;
  atual: number;
  total: number;
};

async function listarEvolucoesUsuario(
  pacienteIds: Array<string | number>
): Promise<Evolucao[]> {
  if (pacienteIds.length === 0) return [];

  const idsTexto = pacienteIds.map((id) => String(id));
  const CHUNK = 80;
  const unicas = new Map<string, Evolucao>();

  for (let i = 0; i < idsTexto.length; i += CHUNK) {
    const pedaco = idsTexto.slice(i, i + CHUNK);
    const res = await supabase
      .from(TABLES.EVOLUCOES)
      .select("*")
      .in("paciente_id", pedaco);

    if (res.error) throw new Error(res.error.message);

    for (const ev of (res.data || []) as Evolucao[]) {
      unicas.set(String(ev.id), ev);
    }
  }

  return [...unicas.values()];
}

async function listarAnamnesesUsuario(userId: string): Promise<PacienteAnamnese[]> {
  const res = await supabase
    .from(TABLES.PACIENTE_ANAMNESE)
    .select("*")
    .eq("user_id", userId);
  if (res.error) throw new Error(res.error.message);
  return (res.data || []) as PacienteAnamnese[];
}

async function listarFormulariosUsuario(
  userId: string
): Promise<PacienteFormulario[]> {
  const res = await supabase
    .from(TABLES.PACIENTE_FORMULARIOS)
    .select("*")
    .eq("user_id", userId);
  if (res.error) throw new Error(res.error.message);
  return (res.data || []) as PacienteFormulario[];
}

async function listarDocumentosUsuario(
  userId: string
): Promise<PacienteDocumento[]> {
  const res = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (res.error) throw new Error(res.error.message);
  return (res.data || []) as PacienteDocumento[];
}

async function embutirArquivoDocumento(
  documento: PacienteDocumento
): Promise<BackupArquivoEmbutido> {
  const ref = refArquivoDocumento(documento);
  const base: BackupArquivoEmbutido = {
    ref,
    nome_arquivo: documento.nome_arquivo,
    tipo_mime: documento.tipo_mime,
    tamanho_bytes: documento.tamanho_bytes,
    storage_path_original: documento.storage_path,
  };

  const tamanho = Number(documento.tamanho_bytes || 0);
  if (tamanho > BACKUP_ARQUIVO_MAX_BYTES) {
    return {
      ...base,
      omitido: true,
      motivo: `Arquivo acima de ${Math.round(BACKUP_ARQUIVO_MAX_BYTES / (1024 * 1024))}MB.`,
    };
  }

  const download = await buscarBlobDocumento(documento);
  if (download.error || !download.data) {
    return {
      ...base,
      omitido: true,
      motivo: download.error?.message || "Não foi possível baixar o arquivo.",
    };
  }

  return {
    ...base,
    base64: await blobParaBase64(download.data),
  };
}

async function embutirArquivoModelo(
  arquivo: ModeloArquivo
): Promise<BackupArquivoEmbutido> {
  const ref = refArquivoModelo(arquivo);
  const base: BackupArquivoEmbutido = {
    ref,
    nome_arquivo: arquivo.nome_arquivo,
    tipo_mime: arquivo.tipo_mime,
    tamanho_bytes: arquivo.tamanho_bytes,
    storage_path_original: arquivo.storage_path,
  };

  const tamanho = Number(arquivo.tamanho_bytes || 0);
  if (tamanho > BACKUP_ARQUIVO_MAX_BYTES) {
    return {
      ...base,
      omitido: true,
      motivo: `Arquivo acima de ${Math.round(BACKUP_ARQUIVO_MAX_BYTES / (1024 * 1024))}MB.`,
    };
  }

  const download = await supabase.storage
    .from(MODELOS_ARQUIVOS_BUCKET)
    .download(arquivo.storage_path);

  if (download.error || !download.data) {
    return {
      ...base,
      omitido: true,
      motivo: download.error?.message || "Não foi possível baixar o arquivo.",
    };
  }

  return {
    ...base,
    base64: await blobParaBase64(download.data),
  };
}

export async function exportarBackupClinicaCompleto(
  userId: string,
  perfil?: BackupClinicaPerfil,
  onProgress?: (progresso: ProgressoBackupClinica) => void
): Promise<BackupClinicaPayload> {
  onProgress?.({ etapa: "Carregando dados", atual: 0, total: 1 });

  const [
    pacientesRes,
    sessoesRes,
    frequenciasRes,
    documentoModelosRes,
    formularioModelosRes,
    modeloArquivosRes,
  ] = await Promise.all([
    listPacientes(userId),
    listSessoes(userId),
    listFrequenciasResumo(userId),
    listDocumentoModelos(userId),
    listFormularioModelos(userId),
    listModeloArquivos(userId),
  ]);

  const erro =
    pacientesRes.error?.message ||
    sessoesRes.error?.message ||
    frequenciasRes.error?.message ||
    documentoModelosRes.error?.message ||
    formularioModelosRes.error?.message ||
    modeloArquivosRes.error?.message;

  if (erro) throw new Error(erro);

  const pacientes = (pacientesRes.data || []) as Paciente[];
  const sessoes = (sessoesRes.data || []) as Sessao[];
  const frequencias = (frequenciasRes.data || []) as Frequencia[];
  const documentoModelos = (documentoModelosRes.data || []) as DocumentoModelo[];
  const formularioModelos = (formularioModelosRes.data ||
    []) as FormularioModelo[];
  const modeloArquivos = (modeloArquivosRes.data || []) as ModeloArquivo[];

  onProgress?.({ etapa: "Prontuários e formulários", atual: 1, total: 4 });

  const [evolucoes, anamneses, formularios, documentos] = await Promise.all([
    listarEvolucoesUsuario(pacientes.map((p) => p.id)),
    listarAnamnesesUsuario(userId),
    listarFormulariosUsuario(userId),
    listarDocumentosUsuario(userId),
  ]);

  onProgress?.({ etapa: "Arquivos de pacientes", atual: 2, total: 4 });

  const arquivosDocumentos: BackupArquivoEmbutido[] = [];
  for (let i = 0; i < documentos.length; i += 1) {
    onProgress?.({
      etapa: "Arquivos de pacientes",
      atual: i + 1,
      total: documentos.length,
    });
    arquivosDocumentos.push(await embutirArquivoDocumento(documentos[i]!));
  }

  onProgress?.({ etapa: "Arquivos de modelos", atual: 3, total: 4 });

  const arquivosModelos: BackupArquivoEmbutido[] = [];
  for (let i = 0; i < modeloArquivos.length; i += 1) {
    onProgress?.({
      etapa: "Arquivos de modelos",
      atual: i + 1,
      total: modeloArquivos.length,
    });
    arquivosModelos.push(await embutirArquivoModelo(modeloArquivos[i]!));
  }

  onProgress?.({ etapa: "Finalizando", atual: 4, total: 4 });

  return montarBackupClinicaV2({
    exportadoEm: new Date().toISOString(),
    perfil,
    pacientes,
    sessoes,
    frequencias,
    evolucoes,
    anamneses,
    formularios,
    documentos,
    arquivosDocumentos,
    documentoModelos,
    formularioModelos,
    modeloArquivos,
    arquivosModelos,
  });
}

/** Garante formulários por paciente quando a listagem global falhar parcialmente. */
export async function listarFormulariosPorPacientes(
  userId: string,
  pacientes: Paciente[]
): Promise<PacienteFormulario[]> {
  const todos: PacienteFormulario[] = [];
  for (const paciente of pacientes) {
    const res = await listPacienteFormularios(userId, paciente.id);
    if (res.error) continue;
    todos.push(...((res.data || []) as PacienteFormulario[]));
  }
  return todos;
}

export async function listarDocumentosPorPacientes(
  userId: string,
  pacientes: Paciente[]
): Promise<PacienteDocumento[]> {
  const todos: PacienteDocumento[] = [];
  for (const paciente of pacientes) {
    const res = await listDocumentosPorPaciente(userId, paciente.id);
    if (res.error) continue;
    todos.push(...((res.data || []) as PacienteDocumento[]));
  }
  return todos;
}

export { PACIENTE_DOCUMENTOS_BUCKET, MODELOS_ARQUIVOS_BUCKET };
