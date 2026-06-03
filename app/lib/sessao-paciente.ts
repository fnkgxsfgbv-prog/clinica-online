import { timestampDataHora } from "./ordenar-datas";
import { isStatusCancelada } from "./status";
import type { Sessao } from "../types";

export type GrupoSessaoPaciente = "realizadas" | "futuras" | "canceladas";

export function classificarSessaoPaciente(
  sessao: Sessao,
  agoraMs = Date.now()
): GrupoSessaoPaciente {
  if (isStatusCancelada(sessao.status)) return "canceladas";

  const ts = timestampDataHora(sessao.data, sessao.hora);
  if (ts > agoraMs) return "futuras";

  return "realizadas";
}

export function agruparSessoesPaciente(
  sessoes: Sessao[],
  agoraMs = Date.now()
): Record<GrupoSessaoPaciente, Sessao[]> {
  const grupos: Record<GrupoSessaoPaciente, Sessao[]> = {
    realizadas: [],
    futuras: [],
    canceladas: [],
  };

  for (const sessao of sessoes) {
    grupos[classificarSessaoPaciente(sessao, agoraMs)].push(sessao);
  }

  return grupos;
}
