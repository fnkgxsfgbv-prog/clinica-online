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
];

function pareceTituloSecao(linha: string) {
  const limpa = linha.trim();
  if (!limpa || limpa.length > 90) return false;
  if (/[:：]$/.test(limpa)) return true;
  if (/^\d+[\).\-\s]/.test(limpa)) return true;
  const lower = limpa.toLowerCase();
  return ROTULOS_SECAO.some((rotulo) => lower.includes(rotulo));
}

export function estruturarPlanoBasico(textoExtraido: string) {
  const linhas = textoExtraido
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  if (!linhas.length) return "";

  const partes: string[] = [];
  let tituloAtual = "";
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
    if (pareceTituloSecao(linha)) {
      flushSecao();
      tituloAtual = linha.replace(/[:：]\s*$/, "");
      partes.push(blocoTitulo(tituloAtual));
      continue;
    }

    if (/^[-•*–—]\s+/.test(linha) || /^\d+[\).\-\s]+/.test(linha)) {
      flushParagrafo();
      listaAtual.push(linha.replace(/^[-•*–—]\s+/, "").replace(/^\d+[\).\-\s]+/, ""));
      continue;
    }

    flushLista();
    paragrafoAtual.push(linha);
  }

  flushSecao();
  return partes.join("");
}

type RespostaOpenAi = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export async function estruturarPlanoComIa(textoExtraido: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      html: estruturarPlanoBasico(textoExtraido),
      usouIa: false as const,
    };
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const promptSistema = `Você organiza planos terapêuticos clínicos em HTML simples para prontuário psicológico.
Regras:
- Use SOMENTE informações presentes no texto fornecido; não invente diagnósticos, metas ou técnicas.
- Se algo não estiver no texto, omita.
- Saída: HTML simples com tags h3, p, ul, li, strong. Sem html/body/script/style.
- Agrupe em seções claras quando possível: Objetivos, Fases/Etapas, Intervenções/Técnicas, Monitoramento, Observações.
- Mantenha linguagem clínica fiel ao documento original.
- Responda APENAS com o HTML.`;

  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: promptSistema },
        {
          role: "user",
          content: `Organize este plano terapêutico extraído de PDF:\n\n${textoExtraido.slice(0, 120000)}`,
        },
      ],
    }),
  });

  const corpo = (await resposta.json()) as RespostaOpenAi;
  if (!resposta.ok) {
    throw new Error(
      corpo.error?.message ||
        "Não foi possível organizar o plano com IA. Tente novamente."
    );
  }

  const bruto = corpo.choices?.[0]?.message?.content?.trim() || "";
  const html = sanitizarHtmlPlanoImportado(bruto);
  if (!html) {
    return {
      html: estruturarPlanoBasico(textoExtraido),
      usouIa: false as const,
    };
  }

  return { html, usouIa: true as const };
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
