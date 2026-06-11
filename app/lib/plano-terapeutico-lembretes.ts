import { AVISO_IA_INDISPONIVEL } from "./ia-aviso";
import { chamarModeloClinico } from "./ia-client";
import { iaClinicaAtiva } from "./openai-config";
import { prepararTextoPlanoParaIa } from "./plano-ia-texto";

export type TipoLembreteSeguimento = "foco" | "meta" | "tecnica" | "monitorar";

export type LembreteSeguimentoPlano = {
  tipo: TipoLembreteSeguimento;
  texto: string;
};

export type ModoLembretesPlano = "ia" | "basico";

export type FinalidadeSugestaoPlano = "pre-sessao" | "seguimento";

export type LembretesSessaoPlano = {
  focoHoje: string;
  lembretes: LembreteSeguimentoPlano[];
  usouIa: boolean;
  modo: ModoLembretesPlano;
  avisoIa?: string;
};

type SecaoPlano = {
  titulo: string;
  itens: string[];
  paragrafo: string;
};

function stripTags(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairItensLista(html: string) {
  const itens: string[] = [];
  const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const texto = stripTags(match[1]);
    if (texto) itens.push(texto);
  }
  return itens;
}

export function extrairSecoesPlanoHtml(html: string): SecaoPlano[] {
  const bruto = String(html || "").trim();
  if (!bruto) return [];

  const partes = bruto.split(/<h3[^>]*>/i).filter(Boolean);
  const secoes: SecaoPlano[] = [];

  for (const parte of partes) {
    const [tituloRaw, ...resto] = parte.split(/<\/h3>/i);
    const titulo = stripTags(tituloRaw || "");
    if (!titulo) continue;

    const corpoHtml = resto.join("");
    const itens = extrairItensLista(corpoHtml);
    const paragrafo = stripTags(corpoHtml.replace(/<li[\s\S]*?<\/li>/gi, " "));

    secoes.push({ titulo, itens, paragrafo });
  }

  if (!secoes.length && bruto) {
    secoes.push({
      titulo: "Plano terapêutico",
      itens: extrairItensLista(bruto),
      paragrafo: stripTags(bruto),
    });
  }

  return secoes;
}

function secaoCombina(titulo: string, rotulos: string[]) {
  const lower = titulo.toLowerCase();
  return rotulos.some((rotulo) => lower.includes(rotulo));
}

function escolherSecao(secoes: SecaoPlano[], rotulos: string[]) {
  return secoes.find((secao) => secaoCombina(secao.titulo, rotulos));
}

function limitarTexto(texto: string, maximo = 160) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (!limpo) return "";
  return limpo.length > maximo ? `${limpo.slice(0, maximo)}…` : limpo;
}

function pushLembrete(
  lista: LembreteSeguimentoPlano[],
  tipo: TipoLembreteSeguimento,
  texto: string
) {
  const limpo = limitarTexto(texto, 200);
  if (!limpo) return;
  if (lista.some((item) => item.texto === limpo)) return;
  lista.push({ tipo, texto: limpo });
}

export function gerarLembretesBasicos(planoHtml: string): LembretesSessaoPlano {
  const secoes = extrairSecoesPlanoHtml(planoHtml);
  const lembretes: LembreteSeguimentoPlano[] = [];

  const objetivoGeral = escolherSecao(secoes, [
    "objetivo geral",
    "objetivos gerais",
  ]);
  const objetivosEspecificos = escolherSecao(secoes, [
    "objetivos específicos",
    "objetivos especificos",
    "objetivo específico",
  ]);
  const procedimentos = escolherSecao(secoes, [
    "procedimento",
    "estratégia",
    "estrategia",
    "intervenção",
    "intervencao",
    "técnic",
    "tecnic",
  ]);
  const criterios = escolherSecao(secoes, [
    "critério",
    "criterio",
    "evolução",
    "evolucao",
    "monitor",
    "indicador",
  ]);
  const frequencia = escolherSecao(secoes, ["frequência", "frequencia", "duração"]);

  const focoHoje =
    limitarTexto(objetivoGeral?.paragrafo || "", 180) ||
    limitarTexto(objetivosEspecificos?.itens[0] || "", 180) ||
    limitarTexto(secoes[0]?.paragrafo || "", 180) ||
    "Revisar metas e intervenções do plano vigente.";

  for (const item of (objetivosEspecificos?.itens || []).slice(0, 3)) {
    pushLembrete(lembretes, "meta", item);
  }

  for (const item of (procedimentos?.itens || []).slice(0, 3)) {
    pushLembrete(lembretes, "tecnica", item);
  }

  if (procedimentos?.paragrafo && !procedimentos.itens.length) {
    pushLembrete(lembretes, "tecnica", procedimentos.paragrafo);
  }

  for (const item of (criterios?.itens || []).slice(0, 2)) {
    pushLembrete(lembretes, "monitorar", item);
  }

  if (frequencia?.paragrafo) {
    pushLembrete(lembretes, "monitorar", `Frequência: ${frequencia.paragrafo}`);
  }

  if (!lembretes.length) {
    for (const secao of secoes.slice(0, 4)) {
      if (secao.itens.length) {
        pushLembrete(lembretes, "meta", secao.itens[0]);
      } else if (secao.paragrafo) {
        pushLembrete(lembretes, "meta", secao.paragrafo);
      }
    }
  }

  return {
    focoHoje,
    lembretes: lembretes.slice(0, 6),
    usouIa: false,
    modo: "basico",
  };
}

export function gerarPreparacaoPreSessaoBasica(planoHtml: string): LembretesSessaoPlano {
  const secoes = extrairSecoesPlanoHtml(planoHtml);
  const lembretes: LembreteSeguimentoPlano[] = [];

  const demanda = escolherSecao(secoes, ["demanda", "queixa", "motivo", "hipótese", "hipotese"]);
  const objetivos = escolherSecao(secoes, [
    "objetivo geral",
    "objetivos gerais",
    "objetivos específicos",
    "objetivos especificos",
    "objetivo",
    "meta",
  ]);
  const procedimentos = escolherSecao(secoes, [
    "procedimento",
    "estratégia",
    "estrategia",
    "intervenção",
    "intervencao",
    "técnic",
    "tecnic",
  ]);

  const focoHoje =
    limitarTexto(demanda?.paragrafo || "", 180) ||
    limitarTexto(objetivos?.paragrafo || "", 180) ||
    limitarTexto(objetivos?.itens[0] || "", 180) ||
    "Revisar o plano e definir tema de abertura da sessão.";

  for (const item of (objetivos?.itens || []).slice(0, 3)) {
    pushLembrete(lembretes, "meta", `Revisar: ${item}`);
  }

  for (const item of (procedimentos?.itens || []).slice(0, 2)) {
    pushLembrete(lembretes, "tecnica", `Preparar: ${item}`);
  }

  if (procedimentos?.paragrafo && !procedimentos.itens.length) {
    pushLembrete(lembretes, "tecnica", `Preparar: ${procedimentos.paragrafo}`);
  }

  pushLembrete(lembretes, "monitorar", "Checar continuidade desde a última sessão");

  if (lembretes.length <= 1) {
    for (const secao of secoes.slice(0, 3)) {
      if (secao.itens.length) {
        pushLembrete(lembretes, "meta", `Revisar: ${secao.itens[0]}`);
      } else if (secao.paragrafo) {
        pushLembrete(lembretes, "meta", secao.paragrafo);
      }
    }
  }

  return {
    focoHoje,
    lembretes: lembretes.slice(0, 6),
    usouIa: false,
    modo: "basico",
  };
}

function textoPlanoParaPrompt(planoHtml: string) {
  const secoes = extrairSecoesPlanoHtml(planoHtml);
  return prepararTextoPlanoParaIa(
    secoes
      .map((secao) => {
        const itens = secao.itens.length ? `\n- ${secao.itens.join("\n- ")}` : "";
        return `${secao.titulo}\n${secao.paragrafo}${itens}`;
      })
      .join("\n\n")
  );
}

function contextoPromptPlano({
  sessaoData,
  ultimaEvolucaoResumo,
  textoPlano,
}: {
  sessaoData?: string;
  ultimaEvolucaoResumo?: string;
  textoPlano: string;
}) {
  const contextoSessao = sessaoData ? `Data da sessão: ${sessaoData}\n` : "";
  const contextoEvolucao = ultimaEvolucaoResumo
    ? `Resumo da última evolução (sem identificação):\n${ultimaEvolucaoResumo}\n\n`
    : "";
  return `${contextoSessao}${contextoEvolucao}Plano terapêutico:\n\n${textoPlano}`;
}

function parseRespostaIaLembretes(bruto: string): LembretesSessaoPlano | null {
  const limpo = bruto
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const json = JSON.parse(limpo) as {
      focoHoje?: string;
      lembretes?: Array<{ tipo?: string; texto?: string }>;
    };

    const focoHoje = limitarTexto(json.focoHoje || "", 180);
    const lembretes: LembreteSeguimentoPlano[] = [];

    for (const item of json.lembretes || []) {
      const tipo = item.tipo as TipoLembreteSeguimento;
      if (!["foco", "meta", "tecnica", "monitorar"].includes(tipo)) continue;
      pushLembrete(lembretes, tipo, item.texto || "");
    }

    if (!focoHoje && !lembretes.length) return null;

    return {
      focoHoje: focoHoje || lembretes[0]?.texto || "",
      lembretes: lembretes.slice(0, 6),
      usouIa: true,
      modo: "ia",
    };
  } catch {
    return null;
  }
}

export async function gerarPreparacaoPreSessaoPlano({
  planoHtml,
  sessaoData,
  ultimaEvolucaoResumo,
  usarIaClinica = true,
  somenteBasico = false,
}: {
  planoHtml: string;
  sessaoData?: string;
  ultimaEvolucaoResumo?: string;
  usarIaClinica?: boolean;
  somenteBasico?: boolean;
}) {
  if (somenteBasico || !iaClinicaAtiva(usarIaClinica)) {
    return gerarPreparacaoPreSessaoBasica(planoHtml);
  }

  const textoPlano = textoPlanoParaPrompt(planoHtml);
  const promptSistema = `Você apoia psicólogos a PREPARAR a sessão clínica antes do atendimento, com base no plano terapêutico.
Regras:
- Use SOMENTE informações do plano fornecido; não invente metas, técnicas ou diagnósticos.
- Foque em preparo antecipado: tema de abertura, o que revisar, materiais ou pontos a checar antes de começar.
- NÃO escreva roteiro para usar durante a sessão — isso é preparo prévio.
- Responda APENAS JSON válido no formato:
{"focoHoje":"string","lembretes":[{"tipo":"meta|tecnica|monitorar","texto":"string"}]}
- focoHoje: 1 frase sobre como abrir/preparar esta sessão (máx. 180 caracteres).
- lembretes: 3 a 6 itens, tipos permitidos: meta, tecnica, monitorar.
- Não repita o focoHoje nos lembretes.
- Linguagem clínica, objetiva, em português do Brasil.`;

  try {
    const bruto = await chamarModeloClinico({
      temperature: 0.3,
      responseFormat: "json_object",
      messages: [
        { role: "system", content: promptSistema },
        {
          role: "user",
          content: contextoPromptPlano({
            sessaoData,
            ultimaEvolucaoResumo,
            textoPlano,
          }),
        },
      ],
    });

    const parseado = parseRespostaIaLembretes(bruto);
    if (!parseado) {
      return {
        ...gerarPreparacaoPreSessaoBasica(planoHtml),
        avisoIa: AVISO_IA_INDISPONIVEL,
      };
    }

    return parseado;
  } catch {
    return {
      ...gerarPreparacaoPreSessaoBasica(planoHtml),
      avisoIa: AVISO_IA_INDISPONIVEL,
    };
  }
}

export async function gerarLembretesSessaoPlano({
  planoHtml,
  sessaoData,
  ultimaEvolucaoResumo,
  usarIaClinica = true,
  somenteBasico = false,
}: {
  planoHtml: string;
  sessaoData?: string;
  ultimaEvolucaoResumo?: string;
  usarIaClinica?: boolean;
  somenteBasico?: boolean;
}) {
  if (somenteBasico || !iaClinicaAtiva(usarIaClinica)) {
    return gerarLembretesBasicos(planoHtml);
  }

  const textoPlano = textoPlanoParaPrompt(planoHtml);

  const promptSistema = `Você apoia psicólogos durante sessões clínicas com lembretes práticos baseados no plano terapêutico.
Regras:
- Use SOMENTE informações do plano fornecido; não invente metas, técnicas ou diagnósticos.
- Gere lembretes curtos, acionáveis e adequados para consulta durante a sessão.
- Responda APENAS JSON válido no formato:
{"focoHoje":"string","lembretes":[{"tipo":"meta|tecnica|monitorar","texto":"string"}]}
- focoHoje: 1 frase sobre o foco principal desta sessão (máx. 180 caracteres).
- lembretes: 3 a 6 itens, tipos permitidos: meta, tecnica, monitorar.
- Não repita o focoHoje nos lembretes.
- Linguagem clínica, objetiva, em português do Brasil.`;

  try {
    const bruto = await chamarModeloClinico({
      temperature: 0.3,
      responseFormat: "json_object",
      messages: [
        { role: "system", content: promptSistema },
        {
          role: "user",
          content: contextoPromptPlano({
            sessaoData,
            ultimaEvolucaoResumo,
            textoPlano,
          }),
        },
      ],
    });

    const parseado = parseRespostaIaLembretes(bruto);
    if (!parseado) {
      return {
        ...gerarLembretesBasicos(planoHtml),
        avisoIa: AVISO_IA_INDISPONIVEL,
      };
    }

    return parseado;
  } catch {
    return {
      ...gerarLembretesBasicos(planoHtml),
      avisoIa: AVISO_IA_INDISPONIVEL,
    };
  }
}

export function rotuloTipoLembrete(tipo: TipoLembreteSeguimento) {
  if (tipo === "meta") return "Meta";
  if (tipo === "tecnica") return "Técnica";
  if (tipo === "monitorar") return "Monitorar";
  return "Foco";
}

function escaparHtmlTexto(texto: string) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** HTML simples para colar no editor de pré-sessão. */
export function formatarLembretesHtmlPreSessao(lembretes: LembretesSessaoPlano) {
  const itens = lembretes.lembretes
    .map(
      (item) =>
        `<li><strong>${escaparHtmlTexto(rotuloTipoLembrete(item.tipo))}:</strong> ${escaparHtmlTexto(item.texto)}</li>`
    )
    .join("");

  return `<p><strong>Preparo sugerido:</strong> ${escaparHtmlTexto(lembretes.focoHoje)}</p>${
    itens ? `<ul>${itens}</ul>` : ""
  }`;
}
