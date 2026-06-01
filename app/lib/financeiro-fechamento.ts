import {
  calcularResumoFinanceiro,
  filtrarPorMesReferencia,
  type ResumoFinanceiro,
} from "./financeiro";
import { labelMesAno, mesAnteriorChave } from "./mes";
import type { Frequencia, Paciente, Sessao } from "../types";

export type TotaisFinanceiros = {
  total: number;
  recebido: number;
  pendente: number;
  presencas: number;
  pacientes: number;
};

export type FechamentoMes = {
  mes: string;
  label: string;
  totais: TotaisFinanceiros;
  linhas: ResumoFinanceiro[];
  mesAnterior: string | null;
  labelMesAnterior: string | null;
  totaisAnterior: TotaisFinanceiros | null;
};

export function totaisDeResumo(linhas: ResumoFinanceiro[]): TotaisFinanceiros {
  return {
    total: linhas.reduce((acc, p) => acc + (p.total || 0), 0),
    recebido: linhas.reduce((acc, p) => acc + (p.totalRecebido || 0), 0),
    pendente: linhas.reduce((acc, p) => acc + (p.totalPendente || 0), 0),
    presencas: linhas.reduce((acc, p) => acc + (p.presencas || 0), 0),
    pacientes: linhas.length,
  };
}

export function calcularFechamentoMes(
  pacientes: Paciente[],
  frequencias: Frequencia[],
  sessoes: Sessao[],
  mesChave: string
): FechamentoMes | null {
  const mes = mesChave.trim();
  if (!mes) return null;

  const frequenciasMes = filtrarPorMesReferencia(frequencias, mes);
  const sessoesMes = filtrarPorMesReferencia(sessoes, mes);
  const linhas = calcularResumoFinanceiro(pacientes, frequenciasMes, sessoesMes);
  const totais = totaisDeResumo(linhas);

  const mesAnterior = mesAnteriorChave(mes);
  let totaisAnterior: TotaisFinanceiros | null = null;

  if (mesAnterior) {
    const freqAnt = filtrarPorMesReferencia(frequencias, mesAnterior);
    const sessAnt = filtrarPorMesReferencia(sessoes, mesAnterior);
    totaisAnterior = totaisDeResumo(
      calcularResumoFinanceiro(pacientes, freqAnt, sessAnt)
    );
  }

  return {
    mes,
    label: labelMesAno(mes),
    totais,
    linhas,
    mesAnterior,
    labelMesAnterior: mesAnterior ? labelMesAno(mesAnterior) : null,
    totaisAnterior,
  };
}

/** Variação percentual; `null` se não houver base comparável. */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / anterior) * 100;
}

export function rotuloVariacao(atual: number, anterior: number): string {
  const pct = variacaoPercentual(atual, anterior);
  if (pct === null) {
    if (anterior === 0 && atual > 0) return "novo no período";
    return "—";
  }
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toFixed(1).replace(".", ",")}%`;
}
