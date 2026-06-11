export const FORMAS_PAGAMENTO = [
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "cartao", label: "Cartão" },
  { id: "transferencia", label: "Transferência" },
  { id: "outro", label: "Outro" },
] as const;

export type FormaPagamentoId = (typeof FORMAS_PAGAMENTO)[number]["id"];

export function labelFormaPagamento(forma?: string | null): string {
  const id = String(forma || "").trim().toLowerCase();
  return FORMAS_PAGAMENTO.find((item) => item.id === id)?.label || "";
}
