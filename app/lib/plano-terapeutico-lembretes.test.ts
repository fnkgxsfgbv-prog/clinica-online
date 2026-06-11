import { describe, expect, it } from "vitest";

import {
  extrairSecoesPlanoHtml,
  formatarLembretesHtmlPreSessao,
  gerarLembretesBasicos,
  gerarPreparacaoPreSessaoBasica,
  rotuloTipoLembrete,
} from "./plano-terapeutico-lembretes";

describe("extrairSecoesPlanoHtml", () => {
  it("extrai títulos e listas do html", () => {
    const html =
      "<h3>3. OBJETIVO GERAL</h3><p>Promover autonomia.</p><h3>4. OBJETIVOS ESPECÍFICOS</h3><ul><li>Desenvolver habilidades sociais</li><li>Promover regulação emocional</li></ul>";
    const secoes = extrairSecoesPlanoHtml(html);
    expect(secoes).toHaveLength(2);
    expect(secoes[1].itens).toContain("Desenvolver habilidades sociais");
  });
});

describe("gerarLembretesBasicos", () => {
  it("monta foco e lembretes a partir do plano", () => {
    const html =
      "<h3>3. OBJETIVO GERAL</h3><p>Promover autonomia e qualidade de vida.</p><h3>4. OBJETIVOS ESPECÍFICOS</h3><ul><li>Desenvolver habilidades sociais</li></ul><h3>5. PROCEDIMENTOS E ESTRATÉGIAS DE INTERVENÇÃO</h3><ul><li>Psicoeducação</li></ul><h3>10. CRITÉRIOS DE EVOLUÇÃO</h3><ul><li>Melhora na interação social</li></ul>";
    const resultado = gerarLembretesBasicos(html);
    expect(resultado.focoHoje).toContain("autonomia");
    expect(resultado.lembretes.some((item) => item.texto.includes("habilidades sociais"))).toBe(
      true
    );
    expect(resultado.lembretes.some((item) => item.tipo === "tecnica")).toBe(true);
    expect(resultado.lembretes.some((item) => item.tipo === "monitorar")).toBe(true);
    expect(resultado.usouIa).toBe(false);
    expect(resultado.modo).toBe("basico");
  });
});

describe("formatarLembretesHtmlPreSessao", () => {
  it("monta html com foco e lembretes", () => {
    const html =
      "<h3>3. OBJETIVO GERAL</h3><p>Promover autonomia.</p><h3>4. OBJETIVOS ESPECÍFICOS</h3><ul><li>Desenvolver habilidades sociais</li></ul>";
    const lembretes = gerarLembretesBasicos(html);
    const formatado = formatarLembretesHtmlPreSessao(lembretes);
    expect(formatado).toContain("Preparo sugerido");
    expect(formatado).toContain("<ul>");
  });
});

describe("gerarPreparacaoPreSessaoBasica", () => {
  it("prioriza revisão e preparo", () => {
    const html =
      "<h3>2. DESCRIÇÃO DA DEMANDA</h3><p>Ansiedade social.</p><h3>4. OBJETIVOS ESPECÍFICOS</h3><ul><li>Desenvolver habilidades sociais</li></ul><h3>5. PROCEDIMENTOS</h3><ul><li>Psicoeducação</li></ul>";
    const resultado = gerarPreparacaoPreSessaoBasica(html);
    expect(resultado.focoHoje).toContain("Ansiedade");
    expect(resultado.lembretes.some((item) => item.texto.includes("Revisar:"))).toBe(true);
    expect(resultado.lembretes.some((item) => item.texto.includes("Preparar:"))).toBe(true);
  });
});

describe("rotuloTipoLembrete", () => {
  it("traduz tipos", () => {
    expect(rotuloTipoLembrete("meta")).toBe("Meta");
    expect(rotuloTipoLembrete("tecnica")).toBe("Técnica");
  });
});
