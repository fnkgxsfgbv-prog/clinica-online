/** Valores sugeridos para `Sessao.forma_pagamento` (cadastro na sessão). */
export const FORMAS_PAGAMENTO_PADRAO = [
  "PIX",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
  "Transferência bancária",
  "Convênio",
] as const;

/** Opções do `<select>`: vazio + presets + valor atual se for personalizado. */
export function opcoesFormaPagamentoSelect(atual?: string | null): string[] {
  const v = (atual ?? "").trim();
  const base: string[] = ["", ...FORMAS_PAGAMENTO_PADRAO];
  if (v && !base.includes(v)) base.push(v);
  return base;
}
