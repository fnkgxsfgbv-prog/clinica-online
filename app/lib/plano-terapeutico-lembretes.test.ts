import { describe, expect, it } from "vitest";

import {
  extrairSecoesPlanoHtml,
  formatarLembretesHtmlPreSessao,
  formatarPreparacaoTextoAgenda,
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
  it("monta parágrafo curto para o editor", () => {
    const html =
      "<h3>3. OBJETIVO GERAL</h3><p>Promover autonomia.</p><h3>4. OBJETIVOS ESPECÍFICOS</h3><ul><li>Desenvolver habilidades sociais</li></ul>";
    const lembretes = gerarPreparacaoPreSessaoBasica(html);
    const formatado = formatarLembretesHtmlPreSessao(lembretes);
    expect(formatado).toContain("<p>");
    expect(formatado).not.toContain("Preparo sugerido");
    expect(formatado).not.toContain("<ul>");
  });
});

describe("formatarPreparacaoTextoAgenda", () => {
  it("gera frase fluida curta", () => {
    const html =
      "<h3>5. PROCEDIMENTOS</h3><ul><li>Aplicação dos instrumentos BPA-2</li></ul><h3>4. OBJETIVOS ESPECÍFICOS</h3><ul><li>Participação funcional</li></ul>";
    const lembretes = gerarPreparacaoPreSessaoBasica(html);
    const texto = formatarPreparacaoTextoAgenda(lembretes);
    expect(texto.length).toBeLessThanOrEqual(220);
    expect(texto).toContain("BPA-2");
    expect(texto).not.toMatch(/CID-10/i);
  });

  it("ignora blocos longos de diagnóstico", () => {
    const html =
      "<h3>2. DESCRIÇÃO DA DEMANDA</h3><p>CID-10: F84.0, com necessidade elevada de suporte, caracterizado por prejuízos significativos na comunicação, interação social e regulação comportamental prolongada no plano.</p><h3>5. PROCEDIMENTOS</h3><ul><li>Psicoeducação parental</li></ul>";
    const lembretes = gerarPreparacaoPreSessaoBasica(html);
    const texto = formatarPreparacaoTextoAgenda(lembretes);
    expect(texto).not.toMatch(/CID-10/i);
    expect(texto).toContain("Psicoeducação");
  });
});

describe("gerarPreparacaoPreSessaoBasica", () => {
  it("prioriza procedimentos e objetivos acionáveis", () => {
    const html =
      "<h3>2. DESCRIÇÃO DA DEMANDA</h3><p>Ansiedade social.</p><h3>4. OBJETIVOS ESPECÍFICOS</h3><ul><li>Desenvolver habilidades sociais</li></ul><h3>5. PROCEDIMENTOS</h3><ul><li>Psicoeducação</li></ul>";
    const resultado = gerarPreparacaoPreSessaoBasica(html);
    expect(resultado.textoAgenda).toContain("Psicoeducação");
    expect(resultado.lembretes.some((item) => item.texto.includes("Psicoeducação"))).toBe(true);
    expect(resultado.lembretes.some((item) => /continuidade/i.test(item.texto))).toBe(false);
  });
});

describe("rotuloTipoLembrete", () => {
  it("traduz tipos", () => {
    expect(rotuloTipoLembrete("meta")).toBe("Meta");
    expect(rotuloTipoLembrete("tecnica")).toBe("Técnica");
  });
});
