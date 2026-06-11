import { parseValorBr } from "./moeda";
import { labelFormaPagamento } from "./forma-pagamento";
import type { Paciente, Sessao } from "../types";

export type StatusPagamento = "pendente" | "pago" | "cancelado";

export function normalizarStatusPagamento(valor?: string | null): StatusPagamento {
  const status = String(valor || "").trim().toLowerCase();
  if (status === "pago") return "pago";
  if (status === "cancelado") return "cancelado";
  return "pendente";
}

export function labelStatusPagamento(status?: string | null): string {
  const normalizado = normalizarStatusPagamento(status);
  if (normalizado === "pago") return "Pago";
  if (normalizado === "cancelado") return "Cancelado";
  return "Pendente";
}

export function valorCobrancaSessao(
  sessao: Sessao,
  paciente?: Paciente | null
): number {
  const valorSessao = parseValorBr(sessao.valor);
  if (valorSessao > 0) return valorSessao;

  if (paciente) {
    const valorPaciente = parseValorBr(
      paciente.valor_sessao ?? paciente.valor
    );
    if (valorPaciente > 0) return valorPaciente;
  }

  return 0;
}

export function referenciaPagamentoSessao(userId: string, sessaoId: string | number) {
  return `psicodesk:${userId}:sessao:${sessaoId}`;
}

export function resumoPagamentoSessao(sessao: Sessao) {
  const status = normalizarStatusPagamento(sessao.status_pagamento);
  const forma = labelFormaPagamento(sessao.forma_pagamento);

  return {
    status,
    labelStatus: labelStatusPagamento(status),
    forma,
    pagoEm: sessao.pago_em || null,
    copiaCola: sessao.pagamento_pix_copia_cola || "",
    link: sessao.pagamento_link || "",
    referencia: sessao.pagamento_referencia || "",
  };
}
