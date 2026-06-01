import type { AnamneseCampo } from "../types";
import { formatarDataPaciente } from "./datas-paciente";

export type FormularioExportMeta = {
  nomeFormulario: string;
  pacienteNome?: string;
  pacienteDataNascimento?: string | null;
};

export function gerarTextoFormulario({
  campos,
  nomeFormulario,
  pacienteNome,
  pacienteDataNascimento,
}: FormularioExportMeta & { campos: AnamneseCampo[] }) {
  const data = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const cabecalho = [
    nomeFormulario || "Formulário",
    pacienteNome ? `Paciente: ${pacienteNome}` : "",
    pacienteDataNascimento
      ? `Data de nascimento: ${formatarDataPaciente(pacienteDataNascimento)}`
      : "",
    `Gerado em: ${data}`,
  ].filter(Boolean);

  return [
    ...cabecalho,
    "",
    ...campos.flatMap((campo) => [
      campo.titulo || "Campo sem título",
      campo.resposta?.trim() || "(sem resposta)",
      "",
    ]),
  ].join("\n");
}

export function nomeArquivoFormulario(nomeFormulario: string, extensao = "pdf") {
  const base =
    (nomeFormulario || "Formulario")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 90) || "Formulario";

  return `${base}.${extensao}`;
}

function pareceTituloCampo(linha: string, proxima?: string) {
  const t = linha.trim();
  if (!t || t.length > 120) return false;
  if (/^(paciente|data de nascimento|gerado em|atualizado em):/i.test(t)) {
    return false;
  }
  if (!proxima) return true;
  return proxima.trim().length >= t.length || proxima.length > 40;
}

function parsearCamposPorLinhas(linhas: string[]) {
  const campos: { titulo: string; resposta: string }[] = [];
  let i = 0;

  while (i < linhas.length) {
    const titulo = linhas[i]?.trim();
    if (!titulo) {
      i += 1;
      continue;
    }

    i += 1;
    const respostaLinhas: string[] = [];

    while (i < linhas.length) {
      const atual = linhas[i];
      const proxima = linhas[i + 1];
      if (pareceTituloCampo(atual, proxima) && respostaLinhas.length > 0) {
        break;
      }
      respostaLinhas.push(atual);
      i += 1;
    }

    campos.push({
      titulo,
      resposta: respostaLinhas.join("\n").trim() || "(sem resposta)",
    });
  }

  return campos;
}

export function parsearTextoFormulario(texto: string) {
  const normalizado = texto.replace(/\r\n/g, "\n").trim();
  const blocos = normalizado.split(/\n\n+/);
  const cabecalho = (blocos.shift() || "").split("\n").filter(Boolean);
  const titulo = cabecalho[0] || "Formulário";
  const meta = cabecalho.slice(1);

  let campos = blocos.map((bloco) => {
    const linhas = bloco.split("\n");
    const tituloCampo = linhas[0] || "Campo";
    const resposta = linhas.slice(1).join("\n").trim() || "(sem resposta)";
    return { titulo: tituloCampo, resposta };
  });

  if (campos.length <= 1 && blocos.length === 1) {
    const linhasCorpo = blocos[0].split("\n").filter(Boolean);
    const alternativo = parsearCamposPorLinhas(linhasCorpo);
    if (alternativo.length > campos.length) {
      campos = alternativo;
    }
  }

  if (campos.length === 0 && normalizado) {
    campos = [{ titulo: "Conteúdo", resposta: normalizado }];
  }

  return { titulo, meta, campos };
}

function escaparHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlSecoesCampos(campos: { titulo: string; resposta: string }[]) {
  return campos
    .map(
      (campo) => `
    <section class="campo">
      <h2>${escaparHtml(campo.titulo || "Campo sem título")}</h2>
      <p>${escaparHtml(campo.resposta?.trim() || "(sem resposta)").replaceAll("\n", "<br>")}</p>
    </section>`
    )
    .join("");
}

function htmlEstilosDocumento(tituloPagina: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escaparHtml(tituloPagina)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 24px 48px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 15px;
      line-height: 1.55;
      color: #1a2e1f;
      background: #f4f7f5;
    }
    .pagina {
      max-width: 720px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(26, 46, 31, 0.08);
      padding: 36px 40px 44px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0d3d24;
    }
    .meta {
      margin: 0 0 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e2ebe5;
      color: #4a6354;
      font-size: 0.95rem;
    }
    .meta p { margin: 4px 0; }
    .campo {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid #eef3ef;
    }
    .campo:last-child { border-bottom: none; margin-bottom: 0; }
    .campo h2 {
      margin: 0 0 8px;
      font-size: 1rem;
      font-weight: 600;
      color: #166534;
    }
    .campo p {
      margin: 0;
      white-space: pre-wrap;
      color: #334155;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .pagina { box-shadow: none; padding: 24px; max-width: none; }
    }
  </style>
</head>
<body>
  <article class="pagina">`;
}

export function gerarHtmlFormularioDocumento({
  campos,
  nomeFormulario,
  pacienteNome,
  pacienteDataNascimento,
}: FormularioExportMeta & { campos: AnamneseCampo[] }) {
  const data = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const meta: string[] = [];
  if (pacienteNome) meta.push(`Paciente: ${pacienteNome}`);
  if (pacienteDataNascimento) {
    meta.push(
      `Data de nascimento: ${formatarDataPaciente(pacienteDataNascimento)}`
    );
  }
  meta.push(`Gerado em: ${data}`);

  const camposHtml = campos.map((campo) => ({
    titulo: campo.titulo || "Campo sem título",
    resposta: campo.resposta?.trim() || "(sem resposta)",
  }));

  return `${htmlEstilosDocumento(nomeFormulario || "Formulário")}
    <h1>${escaparHtml(nomeFormulario || "Formulário")}</h1>
    <div class="meta">${meta.map((linha) => `<p>${escaparHtml(linha)}</p>`).join("")}</div>
    ${htmlSecoesCampos(camposHtml)}
  </article>
</body>
</html>`;
}

export function gerarHtmlVisualizacaoTexto(texto: string) {
  const { titulo, meta, campos } = parsearTextoFormulario(texto);

  return `${htmlEstilosDocumento(titulo)}
    <h1>${escaparHtml(titulo)}</h1>
    <div class="meta">${meta.map((linha) => `<p>${escaparHtml(linha)}</p>`).join("")}</div>
    ${htmlSecoesCampos(campos)}
  </article>
</body>
</html>`;
}
