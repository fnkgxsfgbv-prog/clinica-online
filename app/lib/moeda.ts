/** Converte valor do banco/formulário (150, 150.5, "150,00", "R$ 150") para número. */
export function parseValorBr(valor: unknown): number {
  if (valor == null || valor === "") return 0;
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  const texto = String(valor)
    .trim()
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(texto);
  return Number.isFinite(n) ? n : 0;
}

/** Valor compacto para chips horizontais: `R$795`, `R$1,2k`. */
export function formatarMoedaChip(valor: number) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return "R$0";

  if (n >= 1000) {
    const milhares = n / 1000;
    const texto =
      milhares >= 10
        ? String(Math.round(milhares))
        : milhares.toFixed(1).replace(".", ",");
    return `R$${texto}k`;
  }

  if (Number.isInteger(n)) return `R$${n}`;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}
