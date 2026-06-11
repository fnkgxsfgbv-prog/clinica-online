import { AVISO_IA_INDISPONIVEL } from "./ia-aviso";
import { chamarModeloClinico } from "./ia-client";
import { iaClinicaAtiva } from "./openai-config";
import { prepararTextoPdfParaIa } from "./plano-ia-texto";

function escaparHtml(texto: string) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function blocoParagrafo(texto: string) {
  return `<p>${escaparHtml(texto).replace(/\n/g, "<br>")}</p>`;
}

function blocoTitulo(texto: string) {
  return `<h3>${escaparHtml(texto)}</h3>`;
}

function blocoLista(itens: string[]) {
  if (!itens.length) return "";
  return `<ul>${itens.map((item) => `<li>${escaparHtml(item)}</li>`).join("")}</ul>`;
}

const ROTULOS_SECAO = [
  "objetivo",
  "objetivos",
  "meta",
  "metas",
  "fase",
  "fases",
  "etapa",
  "interven",
  "técnic",
  "tecnica",
  "plano",
  "monitor",
  "indicador",
  "frequência",
  "frequencia",
  "tarefa",
  "encaminh",
  "observ",
  "hipótese",
  "hipotese",
  "queixa",
  "demanda",
  "diagnóstico",
  "diagnostico",
  "procedimento",
  "justificativa",
  "protocolo",
  "acompanhamento",
  "critério",
  "criterio",
  "descrição",
  "descricao",
];

function letrasMaiusculas(texto: string) {
  const letras = texto.replace(/[^A-Za-zÀ-ú]/g, "");
  if (!letras.length) return 0;
  const maiusculas = (texto.match(/[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/g) || []).length;
  return maiusculas / letras.length;
}

function pareceTituloSecaoNumerado(linha: string) {
  const match = linha.trim().match(/^(\d{1,2})\.\s+(.+)$/);
  if (!match) return false;
  const titulo = match[2].trim();
  if (titulo.length > 100) return false;
  return letrasMaiusculas(titulo) >= 0.7;
}

function pareceItemLista(linha: string) {
  const limpa = linha.trim();
  if (/^[-•*–—]\s+/.test(limpa)) return true;
  if (/^[a-h][.)]\s+/i.test(limpa)) return true;
  if (/^\d{1,2}[)]\s+/.test(limpa)) return true;
  const match = limpa.match(/^(\d{1,2})\.\s+(.+)$/);
  if (!match) return false;
  return !pareceTituloSecaoNumerado(limpa);
}

function pareceTituloSecao(linha: string) {
  const limpa = linha.trim();
  if (!limpa || limpa.length > 120) return false;
  if (pareceTituloSecaoNumerado(limpa)) return true;
  if (/[:：]$/.test(limpa)) return true;
  if (/^PLANO\s+TERAP[EÊ]UTICO/i.test(limpa)) return true;
  const lower = limpa.toLowerCase();
  if (ROTULOS_SECAO.some((rotulo) => lower.includes(rotulo)) && limpa.length <= 90) {
    return true;
  }
  return false;
}

function textoPdfVeioColado(texto: string) {
  const linhas = texto.split("\n").map((linha) => linha.trim()).filter(Boolean);
  const temSecoesInline = contarSecoesNumeradasInline(texto) >= 2;
  if (linhas.length <= 2 && texto.length > 200 && temSecoesInline) return true;
  if (linhas.length <= 2 && texto.length > 400) return true;
  const proporcaoQuebras = (texto.match(/\n/g)?.length || 0) / Math.max(texto.length, 1);
  return proporcaoQuebras < 0.002 && texto.length > 300;
}

function contarSecoesNumeradasInline(texto: string) {
  return (texto.match(/\d{1,2}\.\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s\-/]{2,}/g) || [])
    .length;
}

function removerBlocosRepetidos(texto: string) {
  const linhas = texto.split("\n").map((linha) => linha.trim()).filter(Boolean);
  if (linhas.length < 4) return texto;

  const contagem = new Map<string, number>();
  for (const linha of linhas) {
    if (linha.length < 25 || linha.length > 220) continue;
    contagem.set(linha, (contagem.get(linha) || 0) + 1);
  }

  const repetidas = new Set(
    [...contagem.entries()].filter(([, vezes]) => vezes >= 2).map(([linha]) => linha)
  );
  if (!repetidas.size) return texto;

  const visto = new Set<string>();
  return linhas
    .filter((linha) => {
      if (!repetidas.has(linha)) return true;
      if (visto.has(linha)) return false;
      visto.add(linha);
      return true;
    })
    .join("\n");
}

function limparEspacosPdf(texto: string) {
  return texto
    .replace(/\r/g, "")
    .replace(/\u0000/g, "")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function quebrarSecoesNumeradasInline(texto: string) {
  return texto.replace(
    /\s+(\d{1,2})\.\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s\-/()]*?)(?=\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕ][a-záéíóúàâêôãõç]|\s+\d{1,2}\.\s|\s+\d{1,2}[)]\s|\s+[a-h][.)]\s|\s*$)/g,
    (_, num, titulo) => {
      if (letrasMaiusculas(titulo) >= 0.65) {
        return `\n\n${num}. ${titulo.trim()}\n`;
      }
      return ` ${num}. ${titulo}`;
    }
  );
}

function quebrarItensListaInline(texto: string) {
  let t = texto;

  t = t.replace(/\s+(\d{1,2})[)]\s+/g, "\n$1) ");

  t = t.replace(/\s+([a-h])[)]\s+/gi, "\n$1) ");

  t = t.replace(/\s+(\d{1,2})\.\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕ][a-záéíóúàâêôãõç])/g, "\n$1. $2");

  t = t.replace(/\s+([a-h])\.\s+/gi, "\n$1. ");

  return t.replace(/\s(?=[-•*–—]\s+)/g, "\n");
}

export function normalizarTextoExtraidoPdf(texto: string) {
  let t = limparEspacosPdf(texto);
  if (!t) return "";

  t = removerBlocosRepetidos(t);

  const precisaOrganizar =
    textoPdfVeioColado(t) || contarSecoesNumeradasInline(t) >= 2;

  if (!precisaOrganizar) {
    return t.replace(/\n{3,}/g, "\n\n");
  }

  t = t.replace(/\s+(PLANO\s+TERAP[EÊ]UTICO[^\n]{0,160})/gi, "\n\n$1\n");

  t = quebrarSecoesNumeradasInline(t);
  t = quebrarItensListaInline(t);

  return t.replace(/\n{3,}/g, "\n\n").trim();
}

export function estruturarPlanoBasico(textoExtraido: string) {
  const normalizado = normalizarTextoExtraidoPdf(textoExtraido);
  const linhas = normalizado
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  if (!linhas.length) return "";

  const partes: string[] = [];
  let paragrafoAtual: string[] = [];
  let listaAtual: string[] = [];

  function flushParagrafo() {
    if (!paragrafoAtual.length) return;
    partes.push(blocoParagrafo(paragrafoAtual.join("\n")));
    paragrafoAtual = [];
  }

  function flushLista() {
    if (!listaAtual.length) return;
    partes.push(blocoLista(listaAtual));
    listaAtual = [];
  }

  function flushSecao() {
    flushParagrafo();
    flushLista();
  }

  for (const linha of linhas) {
    if (/^PLANO\s+TERAP[EÊ]UTICO/i.test(linha)) {
      flushSecao();
      partes.push(blocoTitulo(linha));
      continue;
    }

    if (pareceTituloSecao(linha)) {
      flushSecao();
      const titulo = linha.replace(/[:：]\s*$/, "");
      partes.push(blocoTitulo(titulo));
      continue;
    }

    if (pareceItemLista(linha)) {
      flushParagrafo();
      listaAtual.push(
        linha
          .replace(/^[-•*–—]\s+/, "")
          .replace(/^(\d{1,2})[.)]\s+/, "")
          .replace(/^([a-h])[.)]\s+/i, "")
      );
      continue;
    }

    flushLista();
    paragrafoAtual.push(linha);
  }

  flushSecao();

  const html = partes.join("");
  if (
    html &&
    !html.includes("<h3>") &&
    contarSecoesNumeradasInline(textoExtraido) >= 2
  ) {
    return estruturarPlanoBasico(
      quebrarSecoesNumeradasInline(quebrarItensListaInline(limparEspacosPdf(textoExtraido)))
    );
  }

  return html;
}

type RespostaEstruturacaoPlano = {
  html: string;
  usouIa: boolean;
  avisoIa?: string;
};

export async function estruturarPlanoComIa(
  textoExtraido: string,
  { usarIaClinica = true }: { usarIaClinica?: boolean } = {}
): Promise<RespostaEstruturacaoPlano> {
  if (!iaClinicaAtiva(usarIaClinica)) {
    return {
      html: estruturarPlanoBasico(textoExtraido),
      usouIa: false,
    };
  }

  const textoNormalizado = prepararTextoPdfParaIa(
    normalizarTextoExtraidoPdf(textoExtraido)
  );
  const promptSistema = `Você organiza planos terapêuticos clínicos em HTML simples para prontuário psicológico.
Regras:
- Use SOMENTE informações presentes no texto fornecido; não invente diagnósticos, metas ou técnicas.
- Se algo não estiver no texto, omita.
- Saída: HTML simples com tags h3, p, ul, li, strong. Sem html/body/script/style.
- Separe claramente cada seção numerada (ex.: "1. DIAGNÓSTICO", "2. DESCRIÇÃO DA DEMANDA") em h3 próprio.
- Transforme listas numeradas ou com letras (a., b., 1., 2.) em ul/li.
- Nunca deixe o documento inteiro em um único parágrafo.
- Mantenha linguagem clínica fiel ao documento original.
- Responda APENAS com o HTML.`;

  try {
    const bruto = await chamarModeloClinico({
      temperature: 0.2,
      maxCharsConteudoUsuario: 52_000,
      messages: [
        { role: "system", content: promptSistema },
        {
          role: "user",
          content: `Organize este plano terapêutico extraído de PDF:\n\n${textoNormalizado}`,
        },
      ],
    });

    const html = sanitizarHtmlPlanoImportado(bruto);
    if (!html) {
      return {
        html: estruturarPlanoBasico(textoExtraido),
        usouIa: false,
        avisoIa: AVISO_IA_INDISPONIVEL,
      };
    }

    return { html, usouIa: true };
  } catch {
    return {
      html: estruturarPlanoBasico(textoExtraido),
      usouIa: false,
      avisoIa: AVISO_IA_INDISPONIVEL,
    };
  }
}

export function sanitizarHtmlPlanoImportado(html: string) {
  return html
    .replace(/^```html?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .trim();
}

export function resumoPlanoImportado(html: string, maximo = 220) {
  const texto = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!texto) return "";
  return texto.length > maximo ? `${texto.slice(0, maximo)}…` : texto;
}
