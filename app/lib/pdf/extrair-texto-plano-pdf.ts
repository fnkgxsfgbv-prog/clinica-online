import { extractText, getDocumentProxy } from "unpdf";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export type ExtracaoPdfPlano = {
  texto: string;
  totalPaginas: number;
};

export function validarArquivoPdfPlano(file: File) {
  if (!file) {
    return "Selecione um arquivo PDF.";
  }
  if (file.type && file.type !== "application/pdf") {
    return "Envie apenas arquivos PDF.";
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "O arquivo deve ter extensão .pdf.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "Arquivo inválido ou vazio.";
  }
  if (file.size > MAX_PDF_BYTES) {
    return "PDF muito grande. O limite é 15 MB.";
  }
  return null;
}

export async function extrairTextoDePdf(buffer: ArrayBuffer): Promise<ExtracaoPdfPlano> {
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF muito grande. O limite é 15 MB.");
  }

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const bruto = String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .trim();

  return {
    texto: bruto,
    totalPaginas: totalPages,
  };
}

export function textoPdfTemConteudoUtil(texto: string, minimo = 40) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length >= minimo;
}
