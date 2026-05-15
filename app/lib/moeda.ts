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
