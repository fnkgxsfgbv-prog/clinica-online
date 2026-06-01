import supabase from "../supabase";
import type { Frequencia, Paciente, Sessao } from "../../types";
import {
  deduplicarFrequenciasPorSessao,
  enriquecerFrequencias,
  indicePacientes,
} from "../frequencia-utils";
import {
  isStatusFrequencia,
  normalizarNome,
  rotuloStatusFrequencia,
} from "../status";
import { toFiniteNumberId } from "../id";
import { listPacientes } from "./pacientes";
import { listSessoes, updateSessao } from "./sessoes";
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

/** Quantidade de linhas de frequência por “Carregar mais” no histórico. */
export const FREQUENCIA_HISTORICO_PAGE_SIZE = 150;

export async function listFrequenciasPaginated(
  userId: string,
  offset: number,
  limit: number
) {
  return supabase
    .from(TABLES.FREQUENCIA)
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
}

/**
 * Uma página do histórico: frequências + enriquecimento (nomes).
 * Nas páginas seguintes, passe `cache` com pacientes/sessoes do primeiro carregamento.
 */
export async function fetchHistoricoFrequenciaPage(
  userId: string,
  offset: number,
  limit: number,
  cache?: { pacientes: Paciente[]; sessoes: Sessao[] }
) {
  const freqRes = await listFrequenciasPaginated(userId, offset, limit);

  if (freqRes.error) {
    return {
      frequencias: [] as Frequencia[],
      total: 0,
      pacientes: [] as Paciente[],
      sessoes: [] as Sessao[],
      error: freqRes.error,
    };
  }

  let pacientes = cache?.pacientes;
  let sessoes = cache?.sessoes;

  if (!pacientes || !sessoes) {
    const [{ data: pData, error: pErr }, { data: sData, error: sErr }] =
      await Promise.all([listPacientes(userId), listSessoes(userId)]);

    if (pErr) {
      return {
        frequencias: [],
        total: freqRes.count ?? 0,
        pacientes: [],
        sessoes: [],
        error: pErr,
      };
    }
    if (sErr) {
      return {
        frequencias: [],
        total: freqRes.count ?? 0,
        pacientes: [],
        sessoes: [],
        error: sErr,
      };
    }

    pacientes = pData || [];
    sessoes = sData || [];
  }

  const enriquecidas = enriquecerFrequencias(
    freqRes.data || [],
    pacientes,
    sessoes
  );

  return {
    frequencias: enriquecidas,
    total: freqRes.count ?? 0,
    pacientes,
    sessoes,
    error: null,
  };
}

export async function listFrequencias(userId: string) {
  return supabase
    .from(TABLES.FREQUENCIA)
    .select("*")
    .eq("user_id", userId)
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .order("id", { ascending: true });
}

/** Payload reduzido para o painel (últimos registros). */
export async function listFrequenciasResumo(userId: string, limit = 800) {
  return supabase
    .from(TABLES.FREQUENCIA)
    .select("id,status,sessao_id,paciente_id,paciente_nome,data")
    .eq("user_id", userId)
    .order("data", { ascending: true })
    .order("hora", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
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
    return { inseridos: 0, atualizados: 0, error: leituraError };
  }

  const porSessaoId = new Map<string, Frequencia>();
  for (const f of frequenciasExistentes || []) {
    if (f.sessao_id == null || f.sessao_id === "") continue;
    const sid = String(f.sessao_id);
    const atual = porSessaoId.get(sid);
    if (!atual || Number(f.id) > Number(atual.id)) {
      porSessaoId.set(sid, f);
    }
  }

  const registrosParaCriar: Array<Omit<Frequencia, "id">> = [];
  let atualizados = 0;

  for (const sessao of sessoes) {
    if (!isStatusFrequencia(sessao.status)) continue;

    const rotulo = rotuloStatusFrequencia(sessao.status) ?? sessao.status;
    const sid = String(sessao.id);
    const existente = porSessaoId.get(sid);

    if (existente?.id != null) {
      const rotuloAtual = rotuloStatusFrequencia(existente.status);
      const patch: Partial<Frequencia> & { user_id: string } = {
        user_id: userId,
      };
      let mudou = false;

      if (rotuloAtual !== rotulo) {
        patch.status = rotulo;
        mudou = true;
      }
      if (sessao.data && existente.data !== sessao.data) {
        patch.data = sessao.data;
        mudou = true;
      }
      if (
        sessao.paciente_id != null &&
        String(existente.paciente_id) !== String(sessao.paciente_id)
      ) {
        patch.paciente_id = sessao.paciente_id;
        mudou = true;
      }
      if (
        sessao.paciente_nome &&
        existente.paciente_nome !== sessao.paciente_nome
      ) {
        patch.paciente_nome = sessao.paciente_nome;
        mudou = true;
      }

      if (mudou) {
        const { error } = await supabase
          .from(TABLES.FREQUENCIA)
          .update(patch)
          .eq("user_id", userId)
          .eq("id", existente.id);
        if (!error) atualizados += 1;
      }
      continue;
    }

    registrosParaCriar.push({
      user_id: userId,
      sessao_id: sessao.id,
      paciente_id: sessao.paciente_id,
      paciente_nome: sessao.paciente_nome,
      data: sessao.data,
      status: rotulo,
    });
  }

  if (registrosParaCriar.length === 0) {
    return { inseridos: 0, atualizados, error: null };
  }

  const { error: insertError } = await supabase
    .from(TABLES.FREQUENCIA)
    .insert(registrosParaCriar);

  return {
    inseridos: insertError ? 0 : registrosParaCriar.length,
    atualizados,
    error: insertError,
  };
}

export async function deleteFrequenciaPorSessao(
  userId: string,
  sessaoId: string | number
) {
  const ids = new Set<string | number>([sessaoId, String(sessaoId)]);
  const n = Number(sessaoId);
  if (Number.isFinite(n)) ids.add(n);

  return supabase
    .from(TABLES.FREQUENCIA)
    .delete()
    .eq("user_id", userId)
    .in("sessao_id", [...ids]);
}

/** Remove linhas duplicadas da mesma sessão (mantém o id mais alto). */
export async function limparFrequenciasDuplicadasPorSessao(
  userId: string,
  frequencias: Frequencia[]
) {
  const porSessao = new Map<string, Frequencia[]>();

  for (const f of frequencias) {
    if (f.sessao_id == null || f.sessao_id === "" || f.id == null) continue;
    const sid = String(f.sessao_id);
    const lista = porSessao.get(sid) || [];
    lista.push(f);
    porSessao.set(sid, lista);
  }

  let removidos = 0;

  for (const [, lista] of porSessao) {
    if (lista.length <= 1) continue;
    lista.sort((a, b) => Number(b.id) - Number(a.id));
    const [, ...duplicatas] = lista;

    for (const dup of duplicatas) {
      if (dup.id == null) continue;
      const { error } = await supabase
        .from(TABLES.FREQUENCIA)
        .delete()
        .eq("user_id", userId)
        .eq("id", dup.id);
      if (!error) removidos += 1;
    }
  }

  return { removidos, error: null };
}

/** Alinha status da sessão ao registro de frequência mais recente da mesma sessão. */
export async function alinharStatusSessaoComFrequencia(
  userId: string,
  frequencias: Frequencia[],
  sessoes: Sessao[]
) {
  const canonicas = deduplicarFrequenciasPorSessao(frequencias);
  let corrigidos = 0;

  for (const freq of canonicas) {
    if (freq.sessao_id == null || freq.sessao_id === "") continue;

    const rotuloFreq = rotuloStatusFrequencia(freq.status);
    if (!rotuloFreq) continue;

    const sessao = sessoes.find((s) => String(s.id) === String(freq.sessao_id));
    if (!sessao) continue;

    const rotuloSessao = rotuloStatusFrequencia(sessao.status);

    if (!rotuloSessao) {
      await deleteFrequenciaPorSessao(userId, Number(sessao.id));
      continue;
    }

    if (rotuloSessao === rotuloFreq) continue;

    const { error } = await updateSessao(userId, sessao.id!, {
      status: rotuloFreq,
    });
    if (!error) {
      sessao.status = rotuloFreq;
      corrigidos += 1;
    }
  }

  return { corrigidos, error: null };
}

export async function insertFrequencia(
  payload: Omit<Frequencia, "id">
) {
  return supabase.from(TABLES.FREQUENCIA).insert([payload]);
}

/** Substitui o registro de frequência da sessão (presença/falta) de forma consistente. */
export async function salvarFrequenciaDaSessao(
  userId: string,
  sessao: Pick<Sessao, "id" | "paciente_id" | "paciente_nome" | "data">,
  status: string
) {
  const sessaoIdNumero = toFiniteNumberId(sessao.id);
  const pacienteIdNumero = toFiniteNumberId(sessao.paciente_id);
  if (sessaoIdNumero == null || pacienteIdNumero == null) {
    return {
      error: {
        message:
          "Sessão ou paciente inválido para salvar frequência. Atualize a página e tente novamente.",
        details: "",
        hint: "",
        code: "invalid_id",
      },
    };
  }

  const { error: deleteError } = await deleteFrequenciaPorSessao(
    userId,
    sessaoIdNumero
  );
  if (deleteError) {
    return { error: deleteError };
  }

  const rotulo = rotuloStatusFrequencia(status);
  if (!rotulo) {
    return { error: null };
  }

  return insertFrequencia({
    user_id: userId,
    sessao_id: sessaoIdNumero,
    paciente_id: pacienteIdNumero,
    paciente_nome: sessao.paciente_nome,
    data: sessao.data,
    status: rotulo,
  });
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

export type CarregarFrequenciasOpcoes = {
  /** Sync/reparo no banco (lento). Padrão: false — use true só na 1ª visita da aba ou em “Atualizar”. */
  manutencao?: boolean;
};

async function executarManutencaoFrequencia(
  userId: string,
  pacientesLista: Paciente[],
  sessoesLista: Sessao[],
  frequenciasIniciais: Frequencia[]
) {
  await sincronizarFrequenciaDasSessoes(userId, sessoesLista);

  let frequencias = frequenciasIniciais;

  if (!frequencias.length) {
    const recarregado = await listFrequencias(userId);
    frequencias = recarregado.data || [];
    if (recarregado.error) {
      return { frequencias: [], error: recarregado.error };
    }
  }

  await limparFrequenciasDuplicadasPorSessao(userId, frequencias);
  await repararVinculosFrequencia(
    userId,
    pacientesLista,
    sessoesLista,
    frequencias
  );

  const recarregado = await listFrequencias(userId);
  frequencias = recarregado.data || [];
  if (recarregado.error) {
    return { frequencias: [], error: recarregado.error };
  }

  if (frequencias.length) {
    await alinharStatusSessaoComFrequencia(
      userId,
      frequencias,
      sessoesLista
    );
    const final = await listFrequencias(userId);
    frequencias = final.data || [];
    if (final.error) {
      return { frequencias: [], error: final.error };
    }
  }

  return { frequencias, error: null };
}

/** Carrega dados para frequência/financeiro. Sem `manutencao`, só leitura (rápido). */
export async function carregarFrequenciasCompleto(
  userId: string,
  opcoes: CarregarFrequenciasOpcoes = {}
) {
  const manutencao = opcoes.manutencao === true;

  const [
    { data: pacientes, error: pacientesError },
    { data: sessoes, error: sessoesError },
    { data: frequenciasRaw, error: frequenciasError },
  ] = await Promise.all([
    listPacientes(userId),
    listSessoes(userId),
    listFrequencias(userId),
  ]);

  if (pacientesError) {
    return { pacientes: [], sessoes: [], frequencias: [], error: pacientesError };
  }
  if (sessoesError) {
    return { pacientes: [], sessoes: [], frequencias: [], error: sessoesError };
  }
  if (frequenciasError) {
    return {
      pacientes: pacientes || [],
      sessoes: sessoes || [],
      frequencias: [],
      error: frequenciasError,
    };
  }

  const pacientesLista = pacientes || [];
  const sessoesLista = sessoes || [];
  let frequenciasLista = frequenciasRaw || [];

  if (manutencao) {
    const manut = await executarManutencaoFrequencia(
      userId,
      pacientesLista,
      sessoesLista,
      frequenciasLista
    );
    if (manut.error) {
      return {
        pacientes: pacientesLista,
        sessoes: sessoesLista,
        frequencias: [],
        error: manut.error,
      };
    }
    frequenciasLista = manut.frequencias;
  }

  const enriquecidas = enriquecerFrequencias(
    deduplicarFrequenciasPorSessao(frequenciasLista),
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
