export function resumoTextoClinico(texto?: string | null, limite = 220) {
  const bruto = String(texto || "").trim();
  if (!bruto) return "";

  let limpo = bruto;
  if (typeof document !== "undefined") {
    const elemento = document.createElement("div");
    elemento.innerHTML = bruto;
    limpo = (elemento.textContent || elemento.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } else {
    limpo = bruto
      .replace(/&nbsp;/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!limpo) return "";
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
}

export function planoTerapeuticoTemConteudo(conteudo?: string | null) {
  return resumoTextoClinico(conteudo, Number.POSITIVE_INFINITY).length > 0;
}
