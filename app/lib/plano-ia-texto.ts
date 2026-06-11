import type { Evolucao } from "../types";

/** Texto enviado à IA — sem identificação direta do paciente. */

export function iniciaisParaIa(nome?: string): string {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return "";
  if (partes.length === 1) {
    return `${partes[0].charAt(0).toUpperCase()}.`;
  }
  const primeira = partes[0].charAt(0).toUpperCase();
  const ultima = partes[partes.length - 1].charAt(0).toUpperCase();
  return `${primeira}.${ultima}.`;
}

export function stripHtmlParaIa(html: string, maximo = 2000): string {
  const texto = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!texto) return "";
  return texto.length > maximo ? `${texto.slice(0, maximo)}…` : texto;
}

export function prepararTextoPlanoParaIa(texto: string, maximo = 12_000): string {
  const bruto = String(texto || "").trim();
  if (bruto.length <= maximo) return bruto;
  return `${bruto.slice(0, maximo)}…`;
}

/** Reduz PDF longo priorizando seções numeradas iniciais. */
export function prepararTextoPdfParaIa(texto: string, maximo = 48_000): string {
  const bruto = String(texto || "").trim();
  if (bruto.length <= maximo) return bruto;

  const linhas = bruto.split("\n");
  const blocos: string[] = [];
  let acumulado = "";

  for (const linha of linhas) {
    const proximo = acumulado ? `${acumulado}\n${linha}` : linha;
    if (proximo.length > maximo) break;
    acumulado = proximo;
    if (/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/.test(linha.trim())) {
      blocos.push(linha);
    }
  }

  if (acumulado.length >= maximo * 0.35) {
    return acumulado;
  }

  const corte = bruto.slice(0, maximo);
  const ultimaQuebra = corte.lastIndexOf("\n");
  return ultimaQuebra > maximo * 0.5
    ? corte.slice(0, ultimaQuebra)
    : corte;
}

function campoEvolucao(valor?: string | null) {
  return String(valor || "").trim();
}

export function resumoEvolucaoParaIa(evolucao: Evolucao, maximo = 1500): string {
  const partes = [
    campoEvolucao(evolucao.queixa) && `Queixa: ${campoEvolucao(evolucao.queixa)}`,
    campoEvolucao(evolucao.objetivo) && `Objetivo: ${campoEvolucao(evolucao.objetivo)}`,
    campoEvolucao(evolucao.intervencao) &&
      `Intervenção: ${campoEvolucao(evolucao.intervencao)}`,
    campoEvolucao(evolucao.observacoes) &&
      `Observações: ${campoEvolucao(evolucao.observacoes)}`,
    campoEvolucao(evolucao.plano) && `Plano: ${campoEvolucao(evolucao.plano)}`,
  ].filter(Boolean) as string[];

  if (!partes.length) return "";
  return stripHtmlParaIa(partes.join("\n"), maximo);
}
