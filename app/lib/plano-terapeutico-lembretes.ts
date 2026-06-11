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
  /** Frase curta para coluna Pré-sessão da agenda e editor. */
  textoAgenda?: string;
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

function textoIndesejadoPreSessao(texto: string) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (!limpo) return true;
  if (limpo.length > 140) return true;
  if (/CID-?\s*10|F\d{2}(\.\d+)?|diagnóstico|com necessidade elevada de suporte/i.test(limpo)) {
    return true;
  }
  return false;
}

function limparTextoLembretePreSessao(texto: string) {
  return texto
    .replace(/^Revisar:\s*/i, "")
    .replace(/^Preparar:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pushLembretePreSessao(
  lista: LembreteSeguimentoPlano[],
  tipo: TipoLembreteSeguimento,
  texto: string
) {
  const limpo = limitarTexto(limparTextoLembretePreSessao(texto), 100);
  if (!limpo || textoIndesejadoPreSessao(limpo)) return;
  if (lista.some((item) => item.texto === limpo)) return;
  lista.push({ tipo, texto: limpo });
}

export function formatarPreparacaoTextoAgenda(
  lembretes: LembretesSessaoPlano,
  maximo = 220
) {
  if (lembretes.textoAgenda?.trim()) {
    return limitarTexto(lembretes.textoAgenda.trim(), maximo);
  }

  const partes: string[] = [];
  const foco = limparTextoLembretePreSessao(lembretes.focoHoje);
  if (foco && !textoIndesejadoPreSessao(foco)) {
    partes.push(foco.replace(/\.$/, ""));
  }

  for (const item of lembretes.lembretes) {
    if (partes.length >= 3) break;

    const texto = limparTextoLembretePreSessao(item.texto);
    if (!texto || textoIndesejadoPreSessao(texto)) continue;
    if (item.tipo === "monitorar" && /continuidade|última sessão/i.test(texto)) continue;
    if (partes.some((parte) => parte.toLowerCase().includes(texto.toLowerCase().slice(0, 40)))) {
      continue;
    }

    partes.push(texto.replace(/\.$/, ""));
  }

  if (!partes.length) {
    return "Revisar metas e preparo da sessão com base no plano vigente.";
  }

  if (partes.length === 1) {
    const frase = partes[0].endsWith(".") ? partes[0] : `${partes[0]}.`;
    return limitarTexto(frase, maximo);
  }

  const [primeiro, ...resto] = partes;
  let frase = primeiro;

  if (resto.length === 1) {
    const complemento = resto[0];
    const inicio = complemento.charAt(0).toLowerCase() + complemento.slice(1);
    frase = `${primeiro}, com foco em ${inicio}`;
  } else if (resto.length >= 2) {
    const meio = resto.slice(0, -1).join(", ");
    const ultimo = resto.at(-1) || "";
    frase = `${primeiro}, com foco em ${meio} e ${ultimo.charAt(0).toLowerCase()}${ultimo.slice(1)}`;
  }

  if (!frase.endsWith(".")) frase += ".";
  return limitarTexto(frase, maximo);
}

function enriquecerPreparacaoParaAgenda(resultado: LembretesSessaoPlano): LembretesSessaoPlano {
  const textoAgenda = formatarPreparacaoTextoAgenda(resultado);
  const focoHoje = textoIndesejadoPreSessao(resultado.focoHoje)
    ? textoAgenda
    : limitarTexto(limparTextoLembretePreSessao(resultado.focoHoje), 180) || textoAgenda;

  return {
    ...resultado,
    focoHoje,
    textoAgenda,
    lembretes: resultado.lembretes
      .filter((item) => !textoIndesejadoPreSessao(limparTextoLembretePreSessao(item.texto)))
      .slice(0, 4),
  };
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
  const acoes: string[] = [];

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

  for (const item of (procedimentos?.itens || []).slice(0, 2)) {
    if (textoIndesejadoPreSessao(item)) continue;
    acoes.push(item);
    pushLembretePreSessao(lembretes, "tecnica", item);
  }

  if (procedimentos?.paragrafo && !procedimentos.itens.length) {
    const paragrafo = limitarTexto(procedimentos.paragrafo, 100);
    if (!textoIndesejadoPreSessao(paragrafo)) {
      acoes.push(paragrafo);
      pushLembretePreSessao(lembretes, "tecnica", paragrafo);
    }
  }

  for (const item of (objetivos?.itens || []).slice(0, 2)) {
    if (textoIndesejadoPreSessao(item)) continue;
    acoes.push(item);
    pushLembretePreSessao(lembretes, "meta", item);
  }

  if (!acoes.length && objetivos?.paragrafo && !textoIndesejadoPreSessao(objetivos.paragrafo)) {
    const paragrafo = limitarTexto(objetivos.paragrafo, 100);
    acoes.push(paragrafo);
    pushLembretePreSessao(lembretes, "meta", paragrafo);
  }

  const focoHoje =
    acoes[0] ||
    limitarTexto(objetivos?.itens[0] || "", 100) ||
    "Revisar metas e preparo da sessão com base no plano vigente.";

  if (!lembretes.length) {
    for (const secao of secoes.slice(0, 4)) {
      if (secao.itens.length) {
        pushLembretePreSessao(lembretes, "meta", secao.itens[0]);
      } else if (secao.paragrafo) {
        pushLembretePreSessao(lembretes, "meta", secao.paragrafo);
      }
      if (lembretes.length) break;
    }
  }

  return enriquecerPreparacaoParaAgenda({
    focoHoje,
    lembretes,
    usouIa: false,
    modo: "basico",
  });
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

function parseRespostaIaLembretes(
  bruto: string,
  opcoes: { preSessao?: boolean } = {}
): LembretesSessaoPlano | null {
  const limpo = bruto
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const json = JSON.parse(limpo) as {
      textoAgenda?: string;
      focoHoje?: string;
      lembretes?: Array<{ tipo?: string; texto?: string }>;
    };

    const textoAgenda = limitarTexto(json.textoAgenda || "", 220);
    const focoHoje = limitarTexto(json.textoAgenda || json.focoHoje || "", 180);
    const lembretes: LembreteSeguimentoPlano[] = [];
    const push = opcoes.preSessao ? pushLembretePreSessao : pushLembrete;

    for (const item of json.lembretes || []) {
      const tipo = item.tipo as TipoLembreteSeguimento;
      if (!["foco", "meta", "tecnica", "monitorar"].includes(tipo)) continue;
      push(lembretes, tipo, item.texto || "");
    }

    if (!focoHoje && !textoAgenda && !lembretes.length) return null;

    const resultado: LembretesSessaoPlano = {
      focoHoje: focoHoje || lembretes[0]?.texto || "",
      textoAgenda: textoAgenda || undefined,
      lembretes: lembretes.slice(0, opcoes.preSessao ? 4 : 6),
      usouIa: true,
      modo: "ia",
    };

    return opcoes.preSessao ? enriquecerPreparacaoParaAgenda(resultado) : resultado;
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
- NÃO copie parágrafos longos, códigos CID-10 ou blocos de diagnóstico do plano.
- Responda APENAS JSON válido no formato:
{"textoAgenda":"string","focoHoje":"string","lembretes":[{"tipo":"meta|tecnica|monitorar","texto":"string"}]}
- textoAgenda: UMA frase fluida (máx. 220 caracteres) para a coluna Pré-sessão da agenda. Estilo: "Aplicação dos instrumentos X, com foco na participação funcional."
- focoHoje: resumo curto do preparo (máx. 180 caracteres), preferencialmente igual ao textoAgenda.
- lembretes: 2 a 4 itens curtos (máx. 100 caracteres cada), tipos: meta, tecnica, monitorar.
- Não repita o textoAgenda nos lembretes.
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

    const parseado = parseRespostaIaLembretes(bruto, { preSessao: true });
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

/** HTML mínimo para colar no editor de pré-sessão (texto curto estilo agenda). */
export function formatarLembretesHtmlPreSessao(lembretes: LembretesSessaoPlano) {
  const texto = formatarPreparacaoTextoAgenda(lembretes);
  return `<p>${escaparHtmlTexto(texto)}</p>`;
}
