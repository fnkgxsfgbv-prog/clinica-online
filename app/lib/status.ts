export function normalizarStatus(status?: string | null) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function normalizarNome(nome?: string | null) {
  return normalizarStatus(nome).replace(/\s+/g, " ").trim();
}

/** Status de presença/falta usado na frequência e no financeiro. */
export function canonicalizarStatusFrequencia(
  status?: string | null
): "presente" | "faltou" | null {
  const n = normalizarStatus(status);
  if (n === "presente") return "presente";
  if (n === "faltou" || n === "falta" || n === "ausente") return "faltou";
  return null;
}

export function isStatusPresente(status?: string | null) {
  return canonicalizarStatusFrequencia(status) === "presente";
}

export function isStatusFaltou(status?: string | null) {
  return canonicalizarStatusFrequencia(status) === "faltou";
}

export function isStatusFrequencia(status?: string | null) {
  return canonicalizarStatusFrequencia(status) != null;
}

export function isStatusCancelada(status?: string | null) {
  const n = normalizarStatus(status);
  return n === "cancelada" || n === "cancelado";
}

export function rotuloStatusFrequencia(
  status?: string | null
): "Presente" | "Faltou" | null {
  const c = canonicalizarStatusFrequencia(status);
  if (c === "presente") return "Presente";
  if (c === "faltou") return "Faltou";
  return null;
}

/** Filtro da página de frequência (Presente / Faltou). */
export function frequenciaPassaFiltroStatus(
  statusFiltro: string,
  statusLinha?: string | null
): boolean {
  if (!statusFiltro) return true;
  if (statusFiltro === "Presente") return isStatusPresente(statusLinha);
  if (statusFiltro === "Faltou") return isStatusFaltou(statusLinha);
  return normalizarStatus(statusLinha) === normalizarStatus(statusFiltro);
}

export type VisualFrequenciaAgenda = {
  icone: string;
  rotulo: string;
  classe: string;
  classeCalendario: string;
};

export function visualFrequenciaAgenda(
  status?: string | null
): VisualFrequenciaAgenda {
  const c = canonicalizarStatusFrequencia(status);
  if (c === "presente") {
    return {
      icone: "👍",
      rotulo: "Presente",
      classe: "is-present",
      classeCalendario: "agenda-status-presente",
    };
  }
  if (c === "faltou") {
    return {
      icone: "👎",
      rotulo: "Faltou",
      classe: "is-absent",
      classeCalendario: "agenda-status-faltou",
    };
  }
  if (isStatusCancelada(status)) {
    return {
      icone: "🚫",
      rotulo: "Cancelada",
      classe: "is-cancel",
      classeCalendario: "agenda-status-cancelada",
    };
  }
  return {
    icone: "—",
    rotulo: "Agendada",
    classe: "is-pending",
    classeCalendario: "agenda-status-agendada",
  };
}
