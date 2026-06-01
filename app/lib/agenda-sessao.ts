import { dataReferenciaISO } from "./financeiro";
import {
  canonicalizarStatusFrequencia,
  isStatusCancelada,
  normalizarStatus,
} from "./status";

/** Valor usado nos filtros da agenda (`agendada`, `presente`, `faltou`, `cancelada`). */
export function statusParaFiltroAgenda(status?: string | null): string {
  const freq = canonicalizarStatusFrequencia(status);
  if (freq) return freq;

  const n = normalizarStatus(status);
  if (n === "agendada") return "agendada";
  if (isStatusCancelada(status)) return "cancelada";
  return n;
}

/**
 * Em "Todos", mostra qualquer status (agendada, presente, falta, cancelada).
 */
export function sessaoPassaFiltroAgenda(
  status: string | null | undefined,
  filtro: string
): boolean {
  if (filtro === "todos") {
    return true;
  }
  return statusParaFiltroAgenda(status) === filtro;
}

/** Monta Date local a partir da data/hora da sessão (aceita ISO, datetime e BR). */
export function criarDataHoraSessao(
  dataSessao?: string | null,
  horaSessao?: string | null
): Date | null {
  const iso = dataReferenciaISO(dataSessao);
  if (!iso) return null;

  const [ano, mes, dia] = iso.split("-").map(Number);
  const partesHora = String(horaSessao || "08:00").trim().split(":");
  const h = Number(partesHora[0]);
  const m = Number(partesHora[1]);

  const inicio = new Date(
    ano,
    mes - 1,
    dia,
    Number.isFinite(h) ? h : 8,
    Number.isFinite(m) ? m : 0,
    0,
    0
  );

  return Number.isNaN(inicio.getTime()) ? null : inicio;
}

export function mesmaDataAgenda(
  dataSessao?: string | null,
  dataISO?: string | null
): boolean {
  if (!dataISO) return false;
  return dataReferenciaISO(dataSessao) === dataISO;
}
