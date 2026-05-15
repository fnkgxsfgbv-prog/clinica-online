import supabase from "../supabase";
import type { Frequencia, Paciente, Sessao } from "../../types";
import { enriquecerFrequencias, indicePacientes } from "../frequencia-utils";
import { isStatusFrequencia, normalizarNome } from "../status";
import { listPacientes } from "./pacientes";
import { listSessoes } from "./sessoes";
import { TABLES } from "./tables";

function chaveData(data?: string | null) {
  if (!data) return "";
  const texto = String(data).trim();
  const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return texto.slice(0, 10);
}

export async function listFrequencias(userId: string) {
  return supabase
    .from(TABLES.FREQUENCIA)
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false });
}

export async function listFrequenciasPresentes(userId: string) {
  return supabase
    .from(TABLES.FREQUENCIA)
    .select("*")
    .eq("user_id", userId)
    .eq("status", "Presente");
}

export async function sincronizarFrequenciaDasSessoes(
  userId: string,
  sessoes: Sessao[]
) {
  const { data: frequenciasExistentes, error: leituraError } =
    await listFrequencias(userId);

  if (leituraError) {
    return { inseridos: 0, error: leituraError };
  }

  const sessaoIdsComFrequencia = new Set(
    (frequenciasExistentes || [])
      .map((f) => f.sessao_id)
      .filter((id) => id != null && id !== "")
      .map((id) => String(id))
  );

  const registrosParaCriar = sessoes
    .filter((sessao) => isStatusFrequencia(sessao.status))
    .filter((sessao) => !sessaoIdsComFrequencia.has(String(sessao.id)))
    .map((sessao) => ({
      user_id: userId,
      sessao_id: sessao.id,
      paciente_id: sessao.paciente_id,
      paciente_nome: sessao.paciente_nome,
      data: sessao.data,
      status: sessao.status,
    }));

  if (registrosParaCriar.length === 0) {
    return { inseridos: 0, error: null };
  }

  const { error: insertError } = await supabase
    .from(TABLES.FREQUENCIA)
    .insert(registrosParaCriar);

  return {
    inseridos: insertError ? 0 : registrosParaCriar.length,
    error: insertError,
  };
}

export async function deleteFrequenciaPorSessao(
  userId: string,
  sessaoId: number
) {
  return supabase
    .from(TABLES.FREQUENCIA)
    .delete()
    .eq("user_id", userId)
    .eq("sessao_id", sessaoId);
}

export async function insertFrequencia(
  payload: Omit<Frequencia, "id">
) {
  return supabase.from(TABLES.FREQUENCIA).insert([payload]);
}

/** Corrige paciente_id / sessao_id em frequências antigas (visíveis com RLS). */
export async function repararVinculosFrequencia(
  userId: string,
  pacientes: Paciente[],
  sessoes: Sessao[],
  frequencias: Frequencia[]
) {
  const { porId, porNome } = indicePacientes(pacientes);
  let corrigidos = 0;

  for (const frequencia of frequencias) {
    if (!frequencia.id) continue;

    const pacientePorNome = normalizarNome(frequencia.paciente_nome)
      ? porNome.get(normalizarNome(frequencia.paciente_nome))
      : undefined;

    const pacientePorId =
      frequencia.paciente_id != null && frequencia.paciente_id !== ""
        ? porId.get(String(frequencia.paciente_id))
        : undefined;

    const sessaoVinculada =
      frequencia.sessao_id != null
        ? sessoes.find((s) => String(s.id) === String(frequencia.sessao_id))
        : undefined;

    const pacientePorSessao = sessaoVinculada
      ? porId.get(String(sessaoVinculada.paciente_id)) ??
        (normalizarNome(sessaoVinculada.paciente_nome)
          ? porNome.get(normalizarNome(sessaoVinculada.paciente_nome))
          : undefined)
      : undefined;

    const paciente = pacientePorNome ?? pacientePorId ?? pacientePorSessao;
    if (!paciente) continue;

    const patch: Partial<Frequencia> & { user_id: string } = {
      user_id: userId,
    };

    if (String(frequencia.paciente_id) !== String(paciente.id)) {
      patch.paciente_id = paciente.id;
    }

    if (
      !frequencia.paciente_nome ||
      frequencia.paciente_nome !== paciente.nome
    ) {
      patch.paciente_nome = paciente.nome;
    }

    const sessao =
      sessaoVinculada ??
      (frequencia.sessao_id == null || frequencia.sessao_id === ""
        ? sessoes.find(
            (s) =>
              String(s.paciente_id) === String(paciente.id) &&
              chaveData(s.data) === chaveData(frequencia.data) &&
              isStatusFrequencia(s.status)
          )
        : undefined);

    if (sessao) {
      if (
        frequencia.sessao_id == null ||
        String(frequencia.sessao_id) !== String(sessao.id)
      ) {
        patch.sessao_id = sessao.id;
      }
      if (!frequencia.data && sessao.data) {
        patch.data = sessao.data;
      }
    }

    if (Object.keys(patch).length <= 1) continue;

    const { error } = await supabase
      .from(TABLES.FREQUENCIA)
      .update(patch)
      .eq("user_id", userId)
      .eq("id", frequencia.id);

    if (!error) corrigidos += 1;
  }

  return { corrigidos, error: null };
}

/** Sincroniza, repara no banco e enriquece frequências para exibição. */
export async function carregarFrequenciasCompleto(userId: string) {
  const [{ data: pacientes, error: pacientesError }, { data: sessoes, error: sessoesError }] =
    await Promise.all([listPacientes(userId), listSessoes(userId)]);

  if (pacientesError) {
    return { pacientes: [], sessoes: [], frequencias: [], error: pacientesError };
  }
  if (sessoesError) {
    return { pacientes: [], sessoes: [], frequencias: [], error: sessoesError };
  }

  const pacientesLista = pacientes || [];
  const sessoesLista = sessoes || [];

  await sincronizarFrequenciaDasSessoes(userId, sessoesLista);

  let { data: frequencias, error: frequenciasError } =
    await listFrequencias(userId);

  if (frequenciasError) {
    return {
      pacientes: pacientesLista,
      sessoes: sessoesLista,
      frequencias: [],
      error: frequenciasError,
    };
  }

  if (frequencias?.length) {
    await repararVinculosFrequencia(
      userId,
      pacientesLista,
      sessoesLista,
      frequencias
    );
    const recarregado = await listFrequencias(userId);
    frequencias = recarregado.data;
    frequenciasError = recarregado.error;
  }

  if (frequenciasError) {
    return {
      pacientes: pacientesLista,
      sessoes: sessoesLista,
      frequencias: [],
      error: frequenciasError,
    };
  }

  const enriquecidas = enriquecerFrequencias(
    frequencias || [],
    pacientesLista,
    sessoesLista
  );

  return {
    pacientes: pacientesLista,
    sessoes: sessoesLista,
    frequencias: enriquecidas,
    error: null,
  };
}
