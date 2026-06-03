import {
  base64ParaBlob,
  refArquivoDocumento,
  refArquivoModelo,
  type BackupClinicaPayload,
  type BackupClinicaPerfil,
  type ModoRestauracaoBackup,
} from "./backup-clinica";
import { PACIENTE_DOCUMENTOS_BUCKET } from "./db/documentos";
import { deletePacienteComDependencias, listPacientes } from "./db/pacientes";
import {
  deleteDocumentoModelo,
  deleteFormularioModelo,
  deleteModeloArquivo,
  listDocumentoModelos,
  listFormularioModelos,
  listModeloArquivos,
  MODELOS_ARQUIVOS_BUCKET,
  normalizarCamposModelo,
} from "./db/modelos";
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

export type ProgressoRestauracaoBackup = {
  etapa: string;
  atual: number;
  total: number;
};

function limparRegistro<T extends Record<string, unknown>>(registro: T, campos: string[]) {
  const copia = { ...registro };
  for (const campo of campos) {
    delete copia[campo];
  }
  return copia;
}

function mapaArquivos(payload: BackupClinicaPayload) {
  const mapa = new Map<string, string>();
  for (const arquivo of payload.arquivosDocumentos) {
    if (arquivo.base64) mapa.set(arquivo.ref, arquivo.base64);
  }
  for (const arquivo of payload.arquivosModelos) {
    if (arquivo.base64) mapa.set(arquivo.ref, arquivo.base64);
  }
  return mapa;
}

async function apagarTodosDadosClinica(userId: string) {
  const pacientesRes = await listPacientes(userId);
  if (pacientesRes.error) throw new Error(pacientesRes.error.message);

  const [docModelos, formModelos, arquivosModelos] = await Promise.all([
    listDocumentoModelos(userId),
    listFormularioModelos(userId),
    listModeloArquivos(userId),
  ]);

  for (const arquivo of arquivosModelos.data || []) {
    await deleteModeloArquivo(userId, arquivo as ModeloArquivo);
  }
  for (const modelo of docModelos.data || []) {
    await deleteDocumentoModelo(userId, (modelo as DocumentoModelo).id);
  }
  for (const modelo of formModelos.data || []) {
    await deleteFormularioModelo(userId, (modelo as FormularioModelo).id);
  }

  for (const paciente of pacientesRes.data || []) {
    const res = await deletePacienteComDependencias(userId, (paciente as Paciente).id);
    if (res.error) throw new Error(res.error.message);
  }
}

async function atualizarPerfilUsuario(
  userId: string,
  perfil?: BackupClinicaPerfil
) {
  if (!perfil) return;

  const { error } = await supabase.auth.updateUser({
    data: {
      name: perfil.nome,
      full_name: perfil.nome,
      phone: perfil.telefone,
      clinic_name: perfil.nomeClinica,
      crp: perfil.crp,
      clinic_address: perfil.endereco,
      clinic_city: perfil.cidade,
      clinic_notes: perfil.observacoes,
    },
  });

  if (error) throw new Error(error.message);
}

async function inserirPacientes(
  userId: string,
  pacientes: Paciente[],
  mapaPacientes: Map<string, string | number>
) {
  for (const paciente of pacientes) {
    const payload = limparRegistro(
      { ...paciente, user_id: userId } as Record<string, unknown>,
      ["id"]
    );

    const res = await supabase
      .from(TABLES.PACIENTES)
      .insert([payload])
      .select("id")
      .single();

    if (res.error || !res.data) {
      throw new Error(res.error?.message || "Falha ao restaurar paciente.");
    }

    mapaPacientes.set(String(paciente.id), res.data.id);
  }
}

async function inserirSessoes(
  userId: string,
  sessoes: Sessao[],
  mapaPacientes: Map<string, string | number>,
  mapaSessoes: Map<string, string | number>
) {
  for (const sessao of sessoes) {
    const pacienteId = mapaPacientes.get(String(sessao.paciente_id));
    if (pacienteId == null) continue;

    const payload = limparRegistro(
      {
        ...sessao,
        user_id: userId,
        paciente_id: pacienteId,
      } as Record<string, unknown>,
      ["id"]
    );

    const res = await supabase
      .from(TABLES.SESSOES)
      .insert([payload])
      .select("id")
      .single();

    if (res.error || !res.data) {
      throw new Error(res.error?.message || "Falha ao restaurar sessão.");
    }

    mapaSessoes.set(String(sessao.id), res.data.id);
  }
}

async function inserirFrequencias(
  userId: string,
  frequencias: Frequencia[],
  mapaPacientes: Map<string, string | number>,
  mapaSessoes: Map<string, string | number>
) {
  for (const freq of frequencias) {
    const pacienteId =
      freq.paciente_id != null
        ? mapaPacientes.get(String(freq.paciente_id))
        : null;
    const sessaoId =
      freq.sessao_id != null ? mapaSessoes.get(String(freq.sessao_id)) : null;

    const payload = limparRegistro(
      {
        ...freq,
        user_id: userId,
        paciente_id: pacienteId ?? freq.paciente_id,
        sessao_id: sessaoId ?? freq.sessao_id,
      } as Record<string, unknown>,
      ["id"]
    );

    const res = await supabase.from(TABLES.FREQUENCIA).insert([payload]);
    if (res.error) throw new Error(res.error.message);
  }
}

async function inserirEvolucoes(
  userId: string,
  evolucoes: Evolucao[],
  mapaPacientes: Map<string, string | number>,
  mapaSessoes: Map<string, string | number>
) {
  for (const evolucao of evolucoes) {
    const pacienteId =
      evolucao.paciente_id != null
        ? mapaPacientes.get(String(evolucao.paciente_id))
        : null;
    const sessaoId =
      evolucao.sessao_id != null
        ? mapaSessoes.get(String(evolucao.sessao_id))
        : null;

    const payload = limparRegistro(
      {
        ...evolucao,
        user_id: userId,
        paciente_id: pacienteId ?? evolucao.paciente_id,
        sessao_id: sessaoId ?? evolucao.sessao_id,
      } as Record<string, unknown>,
      ["id"]
    );

    const res = await supabase.from(TABLES.EVOLUCOES).insert([payload]);
    if (res.error) throw new Error(res.error.message);
  }
}

async function inserirAnamneses(
  userId: string,
  anamneses: PacienteAnamnese[],
  mapaPacientes: Map<string, string | number>
) {
  for (const anamnese of anamneses) {
    const pacienteId = mapaPacientes.get(String(anamnese.paciente_id));
    if (pacienteId == null) continue;

    const payload = limparRegistro(
      {
        ...anamnese,
        user_id: userId,
        paciente_id: String(pacienteId),
        campos: anamnese.campos ?? undefined,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>,
      ["id", "created_at"]
    );

    const res = await supabase.from(TABLES.PACIENTE_ANAMNESE).insert([payload]);
    if (res.error) throw new Error(res.error.message);
  }
}

async function inserirFormularios(
  userId: string,
  formularios: PacienteFormulario[],
  mapaPacientes: Map<string, string | number>,
  mapaFormularioModelos: Map<string, string | number>
) {
  for (const formulario of formularios) {
    const pacienteId = mapaPacientes.get(String(formulario.paciente_id));
    if (pacienteId == null) continue;

    const modeloId =
      formulario.modelo_id != null
        ? mapaFormularioModelos.get(String(formulario.modelo_id))
        : null;

    const payload = limparRegistro(
      {
        ...formulario,
        user_id: userId,
        paciente_id: String(pacienteId),
        modelo_id: modeloId ?? null,
        campos: normalizarCamposModelo(formulario.campos),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>,
      ["id", "created_at"]
    );

    const res = await supabase.from(TABLES.PACIENTE_FORMULARIOS).insert([payload]);
    if (res.error) throw new Error(res.error.message);
  }
}

async function inserirModelos(
  userId: string,
  payload: BackupClinicaPayload,
  mapaDocumentoModelos: Map<string, string | number>,
  mapaFormularioModelos: Map<string, string | number>,
  mapaModeloArquivos: Map<string, string | number>,
  arquivosBase64: Map<string, string>
) {
  for (const modelo of payload.documentoModelos) {
    const insert = limparRegistro(
      {
        ...modelo,
        user_id: userId,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>,
      ["id", "created_at"]
    );

    const res = await supabase
      .from(TABLES.DOCUMENTO_MODELOS)
      .insert([insert])
      .select("id")
      .single();

    if (res.error || !res.data) throw new Error(res.error?.message || "Modelo documento");
    mapaDocumentoModelos.set(String(modelo.id), res.data.id);
  }

  for (const modelo of payload.formularioModelos) {
    const insert = limparRegistro(
      {
        ...modelo,
        user_id: userId,
        campos: normalizarCamposModelo(modelo.campos),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>,
      ["id", "created_at"]
    );

    const res = await supabase
      .from(TABLES.FORMULARIO_MODELOS)
      .insert([insert])
      .select("id")
      .single();

    if (res.error || !res.data) throw new Error(res.error?.message || "Modelo formulário");
    mapaFormularioModelos.set(String(modelo.id), res.data.id);
  }

  for (const arquivo of payload.modeloArquivos) {
    const ref = refArquivoModelo(arquivo);
    const base64 = arquivosBase64.get(ref);
    const storagePath = `${userId}/modelos/${Date.now()}-${arquivo.nome_arquivo}`;

    if (base64) {
      const blob = base64ParaBlob(base64, arquivo.tipo_mime);
      const upload = await supabase.storage
        .from(MODELOS_ARQUIVOS_BUCKET)
        .upload(storagePath, blob, {
          upsert: false,
          contentType: arquivo.tipo_mime || undefined,
        });
      if (upload.error) throw new Error(upload.error.message);
    }

    const insert = limparRegistro(
      {
        ...arquivo,
        user_id: userId,
        storage_path: base64 ? storagePath : arquivo.storage_path,
      } as Record<string, unknown>,
      ["id", "created_at"]
    );

    const res = await supabase
      .from(TABLES.MODELO_ARQUIVOS)
      .insert([insert])
      .select("id")
      .single();

    if (res.error || !res.data) throw new Error(res.error?.message || "Arquivo modelo");
    mapaModeloArquivos.set(String(arquivo.id), res.data.id);
  }
}

async function inserirDocumentos(
  userId: string,
  documentos: PacienteDocumento[],
  mapaPacientes: Map<string, string | number>,
  arquivosBase64: Map<string, string>
) {
  for (const documento of documentos) {
    const pacienteId = mapaPacientes.get(String(documento.paciente_id));
    if (pacienteId == null) continue;

    const ref = refArquivoDocumento(documento);
    const base64 = arquivosBase64.get(ref);
    const storagePath = `${userId}/${String(pacienteId)}/${Date.now()}-${documento.nome_arquivo}`;

    if (base64) {
      const blob = base64ParaBlob(base64, documento.tipo_mime);
      const upload = await supabase.storage
        .from(PACIENTE_DOCUMENTOS_BUCKET)
        .upload(storagePath, blob, {
          upsert: false,
          contentType: documento.tipo_mime || undefined,
        });
      if (upload.error) throw new Error(upload.error.message);
    }

    const payload = limparRegistro(
      {
        ...documento,
        user_id: userId,
        paciente_id: String(pacienteId),
        storage_path: base64 ? storagePath : documento.storage_path,
      } as Record<string, unknown>,
      ["id", "created_at"]
    );

    const res = await supabase.from(TABLES.PACIENTE_DOCUMENTOS).insert([payload]);
    if (res.error) throw new Error(res.error.message);
  }
}

export async function restaurarBackupClinica(
  userId: string,
  payload: BackupClinicaPayload,
  modo: ModoRestauracaoBackup,
  onProgress?: (progresso: ProgressoRestauracaoBackup) => void
) {
  if (modo === "substituir") {
    onProgress?.({ etapa: "Apagando dados atuais", atual: 0, total: 1 });
    await apagarTodosDadosClinica(userId);
  }

  const mapaPacientes = new Map<string, string | number>();
  const mapaSessoes = new Map<string, string | number>();
  const mapaDocumentoModelos = new Map<string, string | number>();
  const mapaFormularioModelos = new Map<string, string | number>();
  const mapaModeloArquivos = new Map<string, string | number>();
  const arquivosBase64 = mapaArquivos(payload);

  onProgress?.({ etapa: "Perfil da clínica", atual: 1, total: 8 });
  await atualizarPerfilUsuario(userId, payload.perfil);

  onProgress?.({ etapa: "Pacientes", atual: 2, total: 8 });
  await inserirPacientes(userId, payload.pacientes, mapaPacientes);

  onProgress?.({ etapa: "Modelos reutilizáveis", atual: 3, total: 8 });
  await inserirModelos(
    userId,
    payload,
    mapaDocumentoModelos,
    mapaFormularioModelos,
    mapaModeloArquivos,
    arquivosBase64
  );

  onProgress?.({ etapa: "Sessões", atual: 4, total: 8 });
  await inserirSessoes(userId, payload.sessoes, mapaPacientes, mapaSessoes);

  onProgress?.({ etapa: "Frequência e evoluções", atual: 5, total: 8 });
  await inserirFrequencias(
    userId,
    payload.frequencias,
    mapaPacientes,
    mapaSessoes
  );
  await inserirEvolucoes(
    userId,
    payload.evolucoes,
    mapaPacientes,
    mapaSessoes
  );

  onProgress?.({ etapa: "Anamnese e formulários", atual: 6, total: 8 });
  await inserirAnamneses(userId, payload.anamneses, mapaPacientes);
  await inserirFormularios(
    userId,
    payload.formularios,
    mapaPacientes,
    mapaFormularioModelos
  );

  onProgress?.({ etapa: "Documentos anexados", atual: 7, total: 8 });
  await inserirDocumentos(
    userId,
    payload.documentos,
    mapaPacientes,
    arquivosBase64
  );

  onProgress?.({ etapa: "Concluído", atual: 8, total: 8 });
}
