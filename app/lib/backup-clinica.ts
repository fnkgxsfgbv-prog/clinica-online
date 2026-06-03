import { baixarBlob } from "./download";
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

export const BACKUP_CLINICA_VERSAO_ATUAL = 2;
export const BACKUP_ARQUIVO_MAX_BYTES = 10 * 1024 * 1024;

export type BackupClinicaPerfil = {
  nome: string;
  telefone: string;
  nomeClinica: string;
  crp: string;
  endereco: string;
  cidade: string;
  observacoes: string;
};

export type BackupArquivoEmbutido = {
  ref: string;
  nome_arquivo: string;
  tipo_mime?: string | null;
  tamanho_bytes?: number | null;
  storage_path_original?: string;
  base64?: string;
  omitido?: boolean;
  motivo?: string;
};

export type BackupClinicaPayloadV1 = {
  versao: 1;
  exportadoEm: string;
  pacientes: Paciente[];
  sessoes: Sessao[];
  frequencias: Frequencia[];
};

export type BackupClinicaPayload = {
  versao: 2;
  exportadoEm: string;
  perfil?: BackupClinicaPerfil;
  pacientes: Paciente[];
  sessoes: Sessao[];
  frequencias: Frequencia[];
  evolucoes: Evolucao[];
  anamneses: PacienteAnamnese[];
  formularios: PacienteFormulario[];
  documentos: PacienteDocumento[];
  arquivosDocumentos: BackupArquivoEmbutido[];
  documentoModelos: DocumentoModelo[];
  formularioModelos: FormularioModelo[];
  modeloArquivos: ModeloArquivo[];
  arquivosModelos: BackupArquivoEmbutido[];
};

export type BackupClinicaResumo = {
  versao: number;
  exportadoEm: string;
  pacientes: number;
  sessoes: number;
  frequencias: number;
  evolucoes: number;
  anamneses: number;
  formularios: number;
  documentos: number;
  arquivosDocumentos: number;
  arquivosDocumentosOmitidos: number;
  documentoModelos: number;
  formularioModelos: number;
  modeloArquivos: number;
  arquivosModelos: number;
  arquivosModelosOmitidos: number;
};

export type ModoRestauracaoBackup = "mesclar" | "substituir";

export function preferenciasPadraoPerfilBackup(): BackupClinicaPerfil {
  return {
    nome: "",
    telefone: "",
    nomeClinica: "",
    crp: "",
    endereco: "",
    cidade: "",
    observacoes: "",
  };
}

export function montarBackupClinicaV2(dados: Omit<BackupClinicaPayload, "versao">): BackupClinicaPayload {
  return {
    versao: BACKUP_CLINICA_VERSAO_ATUAL,
    ...dados,
  };
}

/** Compatível com export antigo (v1). */
export function montarBackupClinica(
  pacientes: Paciente[],
  sessoes: Sessao[],
  frequencias: Frequencia[]
): BackupClinicaPayloadV1 {
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    pacientes,
    sessoes,
    frequencias,
  };
}

export function normalizarBackupClinica(
  bruto: unknown
): BackupClinicaPayload | null {
  if (!bruto || typeof bruto !== "object") return null;
  const obj = bruto as Record<string, unknown>;
  const versao = Number(obj.versao);

  if (versao === 1) {
    const v1 = obj as unknown as BackupClinicaPayloadV1;
    return {
      versao: 2,
      exportadoEm: String(v1.exportadoEm || new Date().toISOString()),
      pacientes: Array.isArray(v1.pacientes) ? v1.pacientes : [],
      sessoes: Array.isArray(v1.sessoes) ? v1.sessoes : [],
      frequencias: Array.isArray(v1.frequencias) ? v1.frequencias : [],
      evolucoes: [],
      anamneses: [],
      formularios: [],
      documentos: [],
      arquivosDocumentos: [],
      documentoModelos: [],
      formularioModelos: [],
      modeloArquivos: [],
      arquivosModelos: [],
    };
  }

  if (versao !== 2) return null;

  return {
    versao: 2,
    exportadoEm: String(obj.exportadoEm || new Date().toISOString()),
    perfil:
      obj.perfil && typeof obj.perfil === "object"
        ? (obj.perfil as BackupClinicaPerfil)
        : undefined,
    pacientes: Array.isArray(obj.pacientes) ? (obj.pacientes as Paciente[]) : [],
    sessoes: Array.isArray(obj.sessoes) ? (obj.sessoes as Sessao[]) : [],
    frequencias: Array.isArray(obj.frequencias)
      ? (obj.frequencias as Frequencia[])
      : [],
    evolucoes: Array.isArray(obj.evolucoes) ? (obj.evolucoes as Evolucao[]) : [],
    anamneses: Array.isArray(obj.anamneses)
      ? (obj.anamneses as PacienteAnamnese[])
      : [],
    formularios: Array.isArray(obj.formularios)
      ? (obj.formularios as PacienteFormulario[])
      : [],
    documentos: Array.isArray(obj.documentos)
      ? (obj.documentos as PacienteDocumento[])
      : [],
    arquivosDocumentos: Array.isArray(obj.arquivosDocumentos)
      ? (obj.arquivosDocumentos as BackupArquivoEmbutido[])
      : [],
    documentoModelos: Array.isArray(obj.documentoModelos)
      ? (obj.documentoModelos as DocumentoModelo[])
      : [],
    formularioModelos: Array.isArray(obj.formularioModelos)
      ? (obj.formularioModelos as FormularioModelo[])
      : [],
    modeloArquivos: Array.isArray(obj.modeloArquivos)
      ? (obj.modeloArquivos as ModeloArquivo[])
      : [],
    arquivosModelos: Array.isArray(obj.arquivosModelos)
      ? (obj.arquivosModelos as BackupArquivoEmbutido[])
      : [],
  };
}

export function resumoBackupClinica(payload: BackupClinicaPayload): BackupClinicaResumo {
  const arquivosDocumentosOmitidos = payload.arquivosDocumentos.filter(
    (a) => a.omitido
  ).length;
  const arquivosModelosOmitidos = payload.arquivosModelos.filter(
    (a) => a.omitido
  ).length;

  return {
    versao: payload.versao,
    exportadoEm: payload.exportadoEm,
    pacientes: payload.pacientes.length,
    sessoes: payload.sessoes.length,
    frequencias: payload.frequencias.length,
    evolucoes: payload.evolucoes.length,
    anamneses: payload.anamneses.length,
    formularios: payload.formularios.length,
    documentos: payload.documentos.length,
    arquivosDocumentos: payload.arquivosDocumentos.filter((a) => a.base64).length,
    arquivosDocumentosOmitidos,
    documentoModelos: payload.documentoModelos.length,
    formularioModelos: payload.formularioModelos.length,
    modeloArquivos: payload.modeloArquivos.length,
    arquivosModelos: payload.arquivosModelos.filter((a) => a.base64).length,
    arquivosModelosOmitidos,
  };
}

export function refArquivoDocumento(documento: PacienteDocumento) {
  return `doc:${documento.id}`;
}

export function refArquivoModelo(arquivo: ModeloArquivo) {
  return `mod:${arquivo.id}`;
}

export function baixarBackupClinica(payload: BackupClinicaPayload | BackupClinicaPayloadV1) {
  const stamp = String(payload.exportadoEm || new Date().toISOString()).slice(0, 10);
  const json = JSON.stringify(payload, null, 2);
  baixarBlob(
    new Blob([json], { type: "application/json;charset=utf-8" }),
    `psicodesk-backup-${stamp}.json`
  );
}

export async function lerArquivoBackupClinica(
  file: File
): Promise<{ payload: BackupClinicaPayload | null; erro: string }> {
  try {
    const texto = await file.text();
    const bruto = JSON.parse(texto) as unknown;
    const payload = normalizarBackupClinica(bruto);
    if (!payload) {
      return { payload: null, erro: "Arquivo inválido ou versão não suportada." };
    }
    if (payload.pacientes.length === 0 && payload.sessoes.length === 0) {
      return {
        payload: null,
        erro: "O backup não contém pacientes nem sessões.",
      };
    }
    return { payload, erro: "" };
  } catch {
    return { payload: null, erro: "Não foi possível ler o JSON do backup." };
  }
}

export function base64ParaBlob(base64: string, tipoMime?: string | null) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: tipoMime || "application/octet-stream" });
}

export async function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1]! : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(blob);
  });
}
