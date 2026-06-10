import { salvarFrequenciaDaSessao } from "./db/frequencia";
import { updateSessao } from "./db/sessoes";
import type { Sessao } from "../types";

/** Atualiza status da sessão e espelha na frequência (mesma regra da página de sessão). */
export async function atualizarStatusSessaoComFrequencia(
  userId: string,
  sessao: Sessao,
  novoStatus: string
) {
  const { error } = await updateSessao(userId, sessao.id!, {
    status: novoStatus,
  });

  if (error) return { error };

  const freq = await salvarFrequenciaDaSessao(userId, sessao, novoStatus);
  if (freq.error) return { error: freq.error };

  return { error: null };
}
