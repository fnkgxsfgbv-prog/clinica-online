const TAGS_BLOCO_HTML =
  /<\/?(?:h[1-6]|p|div|li|ul|ol|blockquote|br|tr|td|th|section|article)[^>]*>/gi;

function htmlParaTextoLegivel(html: string) {
  const bruto = String(html || "").trim();
  if (!bruto) return "";

  if (typeof document !== "undefined") {
    const elemento = document.createElement("div");
    elemento.innerHTML = bruto.replace(TAGS_BLOCO_HTML, " ");
    return (elemento.textContent || elemento.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return bruto
    .replace(/&nbsp;/gi, " ")
    .replace(TAGS_BLOCO_HTML, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resumoTextoClinico(texto?: string | null, limite = 220) {
  const limpo = htmlParaTextoLegivel(texto || "");
  if (!limpo) return "";
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
}

export function planoTerapeuticoTemConteudo(conteudo?: string | null) {
  return resumoTextoClinico(conteudo, Number.POSITIVE_INFINITY).length > 0;
}
