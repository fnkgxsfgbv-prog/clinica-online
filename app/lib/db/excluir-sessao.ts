import type { Sessao } from "../../types";
import { deleteEvolucoesPorSessao } from "./evolucoes";
import { deleteFrequenciaPorSessao } from "./frequencia";
import { corrigirUserIdSessao, deleteSessao, getSessaoById } from "./sessoes";

/** Valores equivalentes para filtros Supabase (bigint vs string). */
export function variantesIdSessao(id: string | number): (string | number)[] {
  const valores = new Set<string | number>();
  valores.add(id);
  valores.add(String(id));
  const n = Number(id);
  if (Number.isFinite(n)) valores.add(n);
  return [...valores];
}

export type ResultadoExclusaoSessao =
  | { ok: true }
  | { ok: false; error: { message: string } };

/**
 * Remove frequência, evoluções e a sessão. Tenta variações de id quando necessário.
 */
export async function excluirSessaoCompleta(
  userId: string,
  sessaoId: string | number
): Promise<ResultadoExclusaoSessao> {
  const ids = variantesIdSessao(sessaoId);

  for (const id of ids) {
    const { error } = await deleteFrequenciaPorSessao(userId, id);
    if (error) {
      return {
        ok: false,
        error: {
          message:
            "Erro ao remover frequência da sessão: " + error.message,
        },
      };
    }
  }

  for (const id of ids) {
    const { error } = await deleteEvolucoesPorSessao(userId, id);
    if (error) {
      return {
        ok: false,
        error: {
          message:
            "Erro ao remover anotações da sessão: " + error.message,
        },
      };
    }
  }

  for (const id of ids) {
    await corrigirUserIdSessao(userId, id);
  }

  let excluiu = false;
  let ultimoErro: { message: string } | null = null;

  for (const id of ids) {
    const { error, data } = await deleteSessao(userId, id);
    if (error) {
      ultimoErro = { message: error.message };
      continue;
    }
    if (data?.length) {
      excluiu = true;
      break;
    }
  }

  if (!excluiu) {
    return {
      ok: false,
      error: ultimoErro ?? {
        message:
          "A sessão não foi excluída. Atualize a página e tente de novo.",
      },
    };
  }

  for (const id of ids) {
    const { data } = await getSessaoById(userId, id);
    if (data) {
      return {
        ok: false,
        error: {
          message:
            "A sessão ainda existe no servidor após excluir. Recarregue a agenda.",
        },
      };
    }
  }

  return { ok: true };
}

/** Mesmo paciente (id ou nome) na mesma data. */
export function sessoesMesmoPacienteNoDia(
  referencia: Sessao,
  candidatas: Sessao[],
  dataIso: string
): Sessao[] {
  return candidatas.filter((s) => {
    if (!mesmaDataSessao(s.data, dataIso)) return false;
    if (String(s.id) === String(referencia.id)) return true;
    if (
      referencia.paciente_id != null &&
      String(s.paciente_id) === String(referencia.paciente_id)
    ) {
      return true;
    }
    const nomeA = (referencia.paciente_nome || "").trim().toLowerCase();
    const nomeB = (s.paciente_nome || "").trim().toLowerCase();
    return nomeA.length > 0 && nomeA === nomeB;
  });
}

function mesmaDataSessao(data?: string | null, dataIso?: string) {
  if (!data || !dataIso) return false;
  const d = String(data).trim().slice(0, 10);
  const iso = dataIso.trim().slice(0, 10);
  if (d === iso) return true;
  const br = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}` === iso;
  return false;
}
