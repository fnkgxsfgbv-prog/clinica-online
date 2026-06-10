import supabase from "../supabase";
import type { Paciente } from "../../types";
import { PACIENTE_DOCUMENTOS_BUCKET } from "./documentos";
import {
  limparObservacoesPaciente,
  salvarDataInicioNasObservacoes,
} from "../paciente-metadata";
import { valoresPacienteIdParaQuery } from "./paciente-id-query";
import { TABLES } from "./tables";

/** Tamanho de página na lista de pacientes (UI “Carregar mais”). */
export const PACIENTES_PAGE_SIZE = 40;

export type ResumoContagemPacientes = {
  total: number;
  ativos: number;
  listaEspera: number;
};

async function contarPacientesUsuario(
  userId: string,
  filtro?: (q: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>
) {
  let q = supabase
    .from(TABLES.PACIENTES)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (filtro) {
    q = filtro(q);
  }

  const { count, error } = await q;
  if (error) return { count: 0, error };
  return { count: count ?? 0, error: null };
}

/** Contagens globais para o resumo no topo da lista de pacientes. */
export async function resumoContagemPacientes(userId: string) {
  const [total, ativos, listaEspera] = await Promise.all([
    contarPacientesUsuario(userId),
    contarPacientesUsuario(userId, (q) =>
      q.or("status.eq.ativo,status.is.null")
    ),
    contarPacientesUsuario(userId, (q) =>
      q.eq("status", "lista de espera")
    ),
  ]);

  const error = total.error || ativos.error || listaEspera.error;
  if (error) {
    return { data: null, error };
  }

  return {
    data: {
      total: total.count,
      ativos: ativos.count,
      listaEspera: listaEspera.count,
    } satisfies ResumoContagemPacientes,
    error: null,
  };
}

export async function listPacientesPaginated(
  userId: string,
  options: {
    offset: number;
    limit: number;
    search?: string;
    status?: string;
  }
) {
  let q = supabase
    .from(TABLES.PACIENTES)
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("nome", { ascending: true })
    .range(options.offset, options.offset + options.limit - 1);

  const termo = options.search?.trim();
  if (termo) {
    q = q.ilike("nome", `%${termo}%`);
  }

  const st = options.status?.trim();
  if (st) {
    if (st.toLowerCase() === "ativo") {
      q = q.or("status.eq.ativo,status.is.null");
    } else {
      q = q.eq("status", st);
    }
  }

  return q;
}

export async function listPacientes(userId: string) {
  return supabase
    .from(TABLES.PACIENTES)
    .select("*")
    .eq("user_id", userId)
    .order("nome", { ascending: true });
}

/** Busca rápida para a barra do topo (evita carregar todos os pacientes no shell). */
export async function buscarPacientesPorNome(
  userId: string,
  termo: string,
  limit = 8
) {
  const t = termo.trim();
  if (t.length < 2) {
    return { data: [] as Paciente[], error: null };
  }

  return supabase
    .from(TABLES.PACIENTES)
    .select("id,nome,status")
    .eq("user_id", userId)
    .ilike("nome", `%${t}%`)
    .order("nome", { ascending: true })
    .limit(limit);
}

export async function getPacienteById(userId: string, id: string | number) {
  const candidatos = valoresPacienteIdParaQuery(id);
  const tentativas = candidatos.length > 0 ? candidatos : [id];

  for (const vid of tentativas) {
    const r = await supabase
      .from(TABLES.PACIENTES)
      .select("*")
      .eq("user_id", userId)
      .eq("id", vid)
      .maybeSingle();

    if (r.error) return r;
    if (r.data) return { data: r.data, error: null };
  }

  return {
    data: null,
    error: {
      message: "Paciente não encontrado",
      details: "",
      hint: "",
      code: "PGRST116",
    },
  };
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
  const rest = prepararPayloadUpdatePaciente(payload);
  delete rest.id;
  delete rest.user_id;

  const candidatos = Array.from(
    new Map(
      [id, String(id), ...valoresPacienteIdParaQuery(id)].map((valor) => [
        `${typeof valor}:${String(valor)}`,
        valor,
      ])
    ).values()
  );

  let ultimoErro: { message: string; code?: string } | null = null;

  for (const vid of candidatos) {
    const result = await supabase
      .from(TABLES.PACIENTES)
      .update(rest)
      .eq("user_id", userId)
      .eq("id", vid)
      .select("id")
      .maybeSingle();

    if (result.error) {
      ultimoErro = result.error;
      if (colunaDataInicioAusente(result.error) && "data_inicio_atendimento" in rest) {
        const fallback = { ...rest };
        delete fallback.data_inicio_atendimento;
        const retry = await supabase
          .from(TABLES.PACIENTES)
          .update(fallback)
          .eq("user_id", userId)
          .eq("id", vid)
          .select("id")
          .maybeSingle();
        if (retry.error) return retry;
        if (retry.data) return retry;
      }
      continue;
    }

    if (result.data) return result;
  }

  if (ultimoErro) {
    return { data: null, error: ultimoErro };
  }

  return {
    data: null,
    error: {
      message: "Paciente não encontrado ou sem permissão para alterar.",
      code: "PGRST116",
      details: "",
      hint: "",
    },
  };
}

function colunaDataInicioAusente(error: { message?: string; code?: string }) {
  const msg = String(error.message || "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    msg.includes("data_inicio_atendimento") ||
    msg.includes("column") && msg.includes("does not exist")
  );
}

/** Normaliza payload de update (data de início com fallback nas observações). */
export function prepararPayloadUpdatePaciente(
  payload: Partial<Paciente>
): Partial<Paciente> {
  const rest = { ...payload };

  if ("data_inicio_atendimento" in rest || "observacoes" in rest) {
    const dataInicio = rest.data_inicio_atendimento ?? null;
    const observacoesBase = limparObservacoesPaciente(rest.observacoes);

    if (dataInicio) {
      rest.observacoes = salvarDataInicioNasObservacoes(
        observacoesBase,
        String(dataInicio)
      );
    } else if ("data_inicio_atendimento" in rest) {
      rest.observacoes = observacoesBase;
    }
  }

  return rest;
}

export async function deletePacienteComDependencias(
  userId: string,
  id: string | number
) {
  const candidatos = Array.from(
    new Map(
      [id, String(id), ...valoresPacienteIdParaQuery(id)].map((valor) => [
        `${typeof valor}:${String(valor)}`,
        valor,
      ])
    ).values()
  );
  const candidatosTexto = candidatos.map((valor) => String(valor));

  const documentos = await supabase
    .from(TABLES.PACIENTE_DOCUMENTOS)
    .select("storage_path")
    .eq("user_id", userId)
    .in("paciente_id", candidatosTexto);
  if (documentos.error) return { error: documentos.error };

  const dependencias = [
    TABLES.FREQUENCIA,
    TABLES.SESSOES,
    TABLES.EVOLUCOES,
    TABLES.PACIENTE_DOCUMENTOS,
    TABLES.PACIENTE_ANAMNESE,
    TABLES.PACIENTE_FORMULARIOS,
  ] as const;

  for (const tabela of dependencias) {
    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq("user_id", userId)
      .in("paciente_id", candidatosTexto);

    if (error) return { error };
  }

  const pacienteDelete = await supabase
    .from(TABLES.PACIENTES)
    .delete()
    .eq("user_id", userId)
    .in("id", candidatos);

  if (pacienteDelete.error) return pacienteDelete;

  const arquivos = (documentos.data || [])
    .map((documento) => documento.storage_path)
    .filter(Boolean);

  if (arquivos.length > 0) {
    await supabase.storage
      .from(PACIENTE_DOCUMENTOS_BUCKET)
      .remove(arquivos);
  }

  return pacienteDelete;
}
