import { fimSemanaISO } from "../financeiro";
import { mesAnteriorChave, ultimoDiaMesChave } from "../mes";
import {
  listFrequencias,
  listFrequenciasPorIntervalo,
  listMesesComPresencaFinanceiro,
} from "./frequencia";
import { listPacientesResumoFinanceiro } from "./pacientes";
import { listSessoes, listSessoesPorIntervalo } from "./sessoes";
import type { Frequencia, Paciente, Sessao } from "../../types";

export type FiltroFinanceiroPeriodo =
  | { tipo: "mes"; mes: string }
  | { tipo: "semana"; inicioSemana: string }
  | { tipo: "intervalo"; inicio: string; fim: string }
  | { tipo: "todos" };

function intervaloDoFiltro(filtro: FiltroFinanceiroPeriodo): {
  inicio: string;
  fim: string;
} | null {
  switch (filtro.tipo) {
    case "mes": {
      const mes = filtro.mes.trim();
      if (!mes) return null;
      const anterior = mesAnteriorChave(mes);
      const inicio = anterior ? `${anterior}-01` : `${mes}-01`;
      const fim = ultimoDiaMesChave(mes);
      return { inicio, fim };
    }
    case "semana": {
      const inicio = filtro.inicioSemana.trim();
      if (!inicio) return null;
      return { inicio, fim: fimSemanaISO(inicio) };
    }
    case "intervalo": {
      const inicio = filtro.inicio.trim();
      const fim = filtro.fim.trim();
      if (!inicio || !fim) return null;
      return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
    }
    default:
      return null;
  }
}

export async function listarMesesDisponiveisFinanceiro(userId: string) {
  return listMesesComPresencaFinanceiro(userId);
}

/** Leitura do financeiro por período (sem manutenção automática). */
export async function carregarFinanceiroPeriodo(
  userId: string,
  filtro: FiltroFinanceiroPeriodo
) {
  const pacientesRes = await listPacientesResumoFinanceiro(userId);
  if (pacientesRes.error) {
    return {
      pacientes: [] as Paciente[],
      sessoes: [] as Sessao[],
      frequencias: [] as Frequencia[],
      error: pacientesRes.error,
    };
  }

  const pacientes = (pacientesRes.data || []) as Paciente[];

  if (filtro.tipo === "todos") {
    const [freqRes, sessRes] = await Promise.all([
      listFrequencias(userId),
      listSessoes(userId),
    ]);
    const error = freqRes.error || sessRes.error;
    if (error) {
      return {
        pacientes,
        sessoes: [] as Sessao[],
        frequencias: [] as Frequencia[],
        error,
      };
    }
    return {
      pacientes,
      sessoes: (sessRes.data || []) as Sessao[],
      frequencias: (freqRes.data || []) as Frequencia[],
      error: null,
    };
  }

  const intervalo = intervaloDoFiltro(filtro);
  if (!intervalo) {
    return {
      pacientes,
      sessoes: [] as Sessao[],
      frequencias: [] as Frequencia[],
      error: null,
    };
  }

  const [freqRes, sessRes] = await Promise.all([
    listFrequenciasPorIntervalo(userId, intervalo.inicio, intervalo.fim),
    listSessoesPorIntervalo(userId, intervalo.inicio, intervalo.fim),
  ]);

  const error = freqRes.error || sessRes.error;
  if (error) {
    return {
      pacientes,
      sessoes: [] as Sessao[],
      frequencias: [] as Frequencia[],
      error,
    };
  }

  return {
    pacientes,
    sessoes: (sessRes.data || []) as Sessao[],
    frequencias: (freqRes.data || []) as Frequencia[],
    error: null,
  };
}
