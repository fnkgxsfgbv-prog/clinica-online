import { timestampDataHora } from "./ordenar-datas";
import { classificarSessaoPaciente } from "./sessao-paciente";
import type { Evolucao, Sessao } from "../types";

export function resolverSessaoParaEvolucao(
  sessoes: Sessao[],
  evolucoes: Evolucao[],
  agoraMs = Date.now()
): string | null {
  const elegiveis = sessoes.filter(
    (sessao) => classificarSessaoPaciente(sessao, agoraMs) === "realizadas"
  );

  if (elegiveis.length === 0) return null;

  const sessoesOrdenadas = [...elegiveis].sort(
    (a, b) =>
      timestampDataHora(b.data, b.hora) - timestampDataHora(a.data, b.hora)
  );

  const sessoesComEvolucao = new Set(
    evolucoes
      .filter((item) => item.sessao_id != null && item.sessao_id !== "")
      .map((item) => String(item.sessao_id))
  );

  const semEvolucao = sessoesOrdenadas.find(
    (sessao) => !sessoesComEvolucao.has(String(sessao.id))
  );

  const alvo = semEvolucao ?? sessoesOrdenadas[0];
  return alvo ? String(alvo.id) : null;
}

export function urlEvolucaoSessao(sessaoId: string | number): string {
  return `/sessao/${sessaoId}?modo=evolucao`;
}
