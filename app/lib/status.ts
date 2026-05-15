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

export function isStatusPresente(status?: string | null) {
  return normalizarStatus(status) === "presente";
}

export function isStatusFaltou(status?: string | null) {
  return normalizarStatus(status) === "faltou";
}

export function isStatusFrequencia(status?: string | null) {
  return isStatusPresente(status) || isStatusFaltou(status);
}
