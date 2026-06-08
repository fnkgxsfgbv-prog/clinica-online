import {
  calcularResumoFinanceiro,
  filtrarPorMesReferencia,
} from "./financeiro";
import { dataIsoHoje } from "./datas-paciente";
import {
  deduplicarFrequenciasPorSessao,
  indicePacientes,
  resolverPaciente,
} from "./frequencia-utils";
import { labelMesAno } from "./mes";
import { parseValorBr } from "./moeda";
import {
  isStatusCancelada,
  isStatusFaltou,
  isStatusPresente,
} from "./status";
import type { Frequencia, Paciente, Sessao } from "../types";

export type StatusSessaoFinanceiro =
  | "presente"
  | "faltou"
  | "cancelada"
  | "agendada";

export type PrevisaoRecebimentoMes = {
  mes: string;
  label: string;
  /** Valor já confirmado (presenças registradas). */
  confirmado: number;
  confirmadoPresencas: number;
  /** Sessões ainda agendadas no mês (contam na previsão). */
  agendado: number;
  agendadoSessoes: number;
  /** Sessões futuras ainda agendadas (a partir de hoje). */
  agendadoFuturo: number;
  agendadoFuturoSessoes: number;
  /** Sessões passadas ainda sem registro de presença/falta/cancelamento. */
  agendadoPassado: number;
  agendadoPassadoSessoes: number;
  /** Cancelamentos — não entram na previsão. */
  cancelado: number;
  canceladoSessoes: number;
  /** Faltas — não entram na previsão. */
  faltou: number;
  faltouSessoes: number;
  /** confirmado + agendado */
  previsaoTotal: number;
  mesEmCurso: boolean;
};

function valorSessaoPaciente(paciente?: Paciente) {
  if (!paciente) return 0;
  return parseValorBr(paciente.valor_sessao ?? paciente.valor);
}

function valorLinha(paciente: Paciente | undefined, sessao: Sessao) {
  const valorSessao = parseValorBr(sessao.valor);
  if (valorSessao > 0) return valorSessao;
  return valorSessaoPaciente(paciente);
}

export function statusSessaoFinanceiro(
  sessao: Sessao,
  frequencia?: Frequencia
): StatusSessaoFinanceiro {
  if (frequencia) {
    if (isStatusPresente(frequencia.status)) return "presente";
    if (isStatusFaltou(frequencia.status)) return "faltou";
  }

  if (isStatusPresente(sessao.status)) return "presente";
  if (isStatusFaltou(sessao.status)) return "faltou";
  if (isStatusCancelada(sessao.status)) return "cancelada";

  return "agendada";
}

export function calcularPrevisaoRecebimentoMes(
  pacientes: Paciente[],
  frequencias: Frequencia[],
  sessoes: Sessao[],
  mesChave: string,
  hoje = dataIsoHoje()
): PrevisaoRecebimentoMes | null {
  const mes = mesChave.trim();
  if (!mes) return null;

  const frequenciasMes = filtrarPorMesReferencia(frequencias, mes);
  const sessoesMes = filtrarPorMesReferencia(sessoes, mes);
  const linhas = calcularResumoFinanceiro(pacientes, frequenciasMes, sessoesMes);

  const confirmado = linhas.reduce((acc, item) => acc + item.total, 0);
  const confirmadoPresencas = linhas.reduce(
    (acc, item) => acc + item.presencas,
    0
  );

  const { porId, porNome } = indicePacientes(pacientes);
  const freqPorSessao = new Map<string, Frequencia>();

  for (const frequencia of deduplicarFrequenciasPorSessao(frequenciasMes)) {
    if (frequencia.sessao_id == null || frequencia.sessao_id === "") continue;
    freqPorSessao.set(String(frequencia.sessao_id), frequencia);
  }

  let agendado = 0;
  let agendadoSessoes = 0;
  let agendadoFuturo = 0;
  let agendadoFuturoSessoes = 0;
  let agendadoPassado = 0;
  let agendadoPassadoSessoes = 0;
  let cancelado = 0;
  let canceladoSessoes = 0;
  let faltou = 0;
  let faltouSessoes = 0;

  for (const sessao of sessoesMes) {
    const paciente = resolverPaciente(
      porId,
      porNome,
      sessao.paciente_id,
      sessao.paciente_nome
    );
    const frequencia = freqPorSessao.get(String(sessao.id));
    const status = statusSessaoFinanceiro(sessao, frequencia);
    const valor = valorLinha(paciente, sessao);
    const dataSessao = String(sessao.data || "").slice(0, 10);

    if (status === "presente") continue;

    if (status === "agendada") {
      agendado += valor;
      agendadoSessoes += 1;
      if (dataSessao && dataSessao >= hoje) {
        agendadoFuturo += valor;
        agendadoFuturoSessoes += 1;
      } else {
        agendadoPassado += valor;
        agendadoPassadoSessoes += 1;
      }
      continue;
    }

    if (status === "cancelada") {
      cancelado += valor;
      canceladoSessoes += 1;
      continue;
    }

    faltou += valor;
    faltouSessoes += 1;
  }

  return {
    mes,
    label: labelMesAno(mes),
    confirmado,
    confirmadoPresencas,
    agendado,
    agendadoSessoes,
    agendadoFuturo,
    agendadoFuturoSessoes,
    agendadoPassado,
    agendadoPassadoSessoes,
    cancelado,
    canceladoSessoes,
    faltou,
    faltouSessoes,
    previsaoTotal: confirmado + agendado,
    mesEmCurso: mes === hoje.slice(0, 7),
  };
}
