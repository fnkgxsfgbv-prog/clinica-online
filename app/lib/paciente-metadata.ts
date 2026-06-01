import type { Paciente } from "../types";

const DATA_INICIO_MARKER = "DATA_INICIO_ATENDIMENTO";
const DATA_INICIO_REGEX =
  /(?:^|\n)\s*\[DATA_INICIO_ATENDIMENTO:(\d{4}-\d{2}-\d{2})\]\s*(?:\n|$)/;

export function extrairDataInicioAtendimento(paciente?: Paciente | null) {
  const valorDireto = paciente?.data_inicio_atendimento;
  if (valorDireto) return String(valorDireto);

  const match = String(paciente?.observacoes || "").match(DATA_INICIO_REGEX);
  return match?.[1] || "";
}

export function limparObservacoesPaciente(observacoes?: string | null) {
  return String(observacoes || "")
    .replace(DATA_INICIO_REGEX, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function salvarDataInicioNasObservacoes(
  observacoes: string,
  dataInicio: string
) {
  const textoLimpo = limparObservacoesPaciente(observacoes);
  if (!dataInicio) return textoLimpo;

  return `${textoLimpo ? `${textoLimpo}\n\n` : ""}[${DATA_INICIO_MARKER}:${dataInicio}]`;
}
