import jsPDF from "jspdf";
import type { DocumentoModelo, Paciente } from "../../types";

const MARGEM = 16;
const LARGURA = 180 - MARGEM * 2;
const LH = 6;
const PAGE_WIDTH = 210;
const PAGE_BOTTOM = 278;

type BlocoPdf = {
  texto: string;
  align: "left" | "center" | "right" | "justify";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  tamanho: number;
  espacamentoDepois: number;
};

function formatarDataHoje() {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date());
}

export function preencherVariaveisDocumento(
  conteudo: string,
  paciente: Paciente
) {
  const valorSessao =
    paciente.valor_sessao != null && String(paciente.valor_sessao).trim()
      ? `R$ ${paciente.valor_sessao}`
      : "";

  return conteudo
    .replaceAll("{{paciente_nome}}", paciente.nome || "")
    .replaceAll("{{paciente_telefone}}", paciente.telefone || "")
    .replaceAll("{{paciente_cid}}", paciente.cid || "")
    .replaceAll("{{data_hoje}}", formatarDataHoje())
    .replaceAll("{{valor_sessao}}", valorSessao);
}

function pareceHtml(valor: string) {
  return /<\/?[a-z][\s\S]*>/i.test(valor);
}

function textoDeNo(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeName.toLowerCase() === "br") return "\n";
  return Array.from(node.childNodes).map(textoDeNo).join("");
}

function contemTag(elemento: Element, tags: string[]) {
  return tags.includes(elemento.tagName.toLowerCase()) || tags.some((tag) => elemento.querySelector(tag));
}

function alinhamento(elemento: Element): BlocoPdf["align"] {
  const htmlElement = elemento as HTMLElement;
  const align = (
    htmlElement.style.textAlign ||
    elemento.getAttribute("align") ||
    "left"
  ).toLowerCase();

  if (align === "center" || align === "right" || align === "justify") {
    return align;
  }

  return "left";
}

function tamanhoFonte(elemento: Element) {
  const tag = elemento.tagName.toLowerCase();
  if (tag === "h1" || tag === "h2") return 16;
  if (tag === "h3") return 13;

  const font = elemento.closest("font");
  const size = font?.getAttribute("size");
  if (size === "5") return 15;
  if (size === "4") return 13;
  if (size === "2") return 9;

  return 11;
}

function criarBloco(elemento: Element, prefixo = ""): BlocoPdf | null {
  const texto = `${prefixo}${textoDeNo(elemento)}`.replace(/\n{3,}/g, "\n\n").trim();
  if (!texto) return null;

  const tag = elemento.tagName.toLowerCase();
  return {
    texto,
    align: alinhamento(elemento),
    bold: tag === "h1" || tag === "h2" || tag === "h3" || contemTag(elemento, ["b", "strong"]),
    italic: contemTag(elemento, ["i", "em"]),
    underline: contemTag(elemento, ["u"]),
    tamanho: tamanhoFonte(elemento),
    espacamentoDepois: tag === "h1" || tag === "h2" || tag === "h3" ? 5 : 4,
  };
}

function extrairBlocosHtml(html: string): BlocoPdf[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocos: BlocoPdf[] = [];
  const elementos = doc.body.querySelectorAll("h1,h2,h3,p,div,li");

  elementos.forEach((elemento) => {
    const tag = elemento.tagName.toLowerCase();
    const bloco = criarBloco(elemento, tag === "li" ? "• " : "");
    if (bloco) blocos.push(bloco);
  });

  if (blocos.length > 0) return blocos;

  const texto = textoDeNo(doc.body).trim();
  return texto
    ? [{ texto, align: "left", bold: false, italic: false, underline: false, tamanho: 11, espacamentoDepois: 4 }]
    : [];
}

function extrairBlocos(conteudo: string): BlocoPdf[] {
  if (pareceHtml(conteudo)) return extrairBlocosHtml(conteudo);

  return conteudo.split(/\n{2,}/).map((bloco) => ({
    texto: bloco.trim() || " ",
    align: "left" as const,
    bold: false,
    italic: false,
    underline: false,
    tamanho: 11,
    espacamentoDepois: 4,
  }));
}

function garantirEspaco(doc: jsPDF, altura: number, y: number) {
  if (y + altura <= PAGE_BOTTOM) return y;
  doc.addPage();
  return MARGEM;
}

function renderizarBloco(doc: jsPDF, bloco: BlocoPdf, yInicial: number) {
  let y = yInicial;
  const estilo =
    bloco.bold && bloco.italic
      ? "bolditalic"
      : bloco.bold
        ? "bold"
        : bloco.italic
          ? "italic"
          : "normal";

  doc.setFont("helvetica", estilo);
  doc.setFontSize(bloco.tamanho);

  const linhas = doc.splitTextToSize(bloco.texto, LARGURA);
  const align = bloco.align === "justify" ? "left" : bloco.align;
  const x =
    align === "center"
      ? PAGE_WIDTH / 2
      : align === "right"
        ? PAGE_WIDTH - MARGEM
        : MARGEM;

  for (const linha of linhas) {
    y = garantirEspaco(doc, LH + 2, y);
    doc.text(linha, x, y, { align });
    if (bloco.underline) {
      const larguraLinha = doc.getTextWidth(linha);
      const inicio =
        align === "center"
          ? x - larguraLinha / 2
          : align === "right"
            ? x - larguraLinha
            : x;
      doc.line(inicio, y + 1, inicio + larguraLinha, y + 1);
    }
    y += LH;
  }

  return y + bloco.espacamentoDepois;
}

export function gerarDocumentoModeloPdfBlob(
  modelo: DocumentoModelo,
  paciente: Paciente
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const conteudo = preencherVariaveisDocumento(modelo.conteudo || "", paciente);
  let y = MARGEM;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(modelo.nome || "Documento", MARGEM, y);
  y += 12;

  for (const bloco of extrairBlocos(conteudo)) {
    y = renderizarBloco(doc, bloco, y);
  }

  return doc.output("blob");
}
