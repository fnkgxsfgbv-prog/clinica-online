import { describe, expect, it } from "vitest";

import {
  estruturarPlanoBasico,
  normalizarTextoExtraidoPdf,
  resumoPlanoImportado,
  sanitizarHtmlPlanoImportado,
} from "./plano-terapeutico-importacao";
import { textoPdfTemConteudoUtil } from "./pdf/extrair-texto-plano-pdf";

describe("normalizarTextoExtraidoPdf", () => {
  it("quebra seções numeradas em texto colado", () => {
    const bruto =
      "NeuroIntegrar Terapias Integradas Hadryan Castro Reis 1. DIAGNÓSTICO Transtorno do Espectro Autista grau leve. 2. DESCRIÇÃO DA DEMANDA Paciente encaminhado para avaliação. 3. OBJETIVO GERAL Promover autonomia.";
    const normalizado = normalizarTextoExtraidoPdf(bruto);
    expect(normalizado).toContain("1. DIAGNÓSTICO");
    expect(normalizado).toContain("2. DESCRIÇÃO DA DEMANDA");
    expect(normalizado).toContain("3. OBJETIVO GERAL");
    expect(normalizado.split("\n").filter(Boolean).length).toBeGreaterThan(3);
  });

  it("quebra itens de lista numerados", () => {
    const bruto =
      "4. OBJETIVOS ESPECÍFICOS 1. Desenvolver habilidades sociais 2. Promover regulação emocional 3. Ampliar comunicação funcional";
    const normalizado = normalizarTextoExtraidoPdf(bruto);
    expect(normalizado).toContain("1. Desenvolver");
    expect(normalizado).toContain("2. Promover");
    expect(normalizado).toContain("3. Ampliar");
  });

  it("quebra itens com parênteses (1) 2))", () => {
    const bruto =
      "4. OBJETIVOS ESPECÍFICOS 1) Desenvolver habilidades sociais 2) Promover regulação emocional 3) Ampliar comunicação funcional";
    const normalizado = normalizarTextoExtraidoPdf(bruto);
    expect(normalizado).toContain("1) Desenvolver");
    expect(normalizado).toContain("2) Promover");
    expect(normalizado).toContain("3) Ampliar");
  });

  it("remove cabeçalhos repetidos entre páginas", () => {
    const bruto = [
      "NeuroIntegrar Terapias Integradas Rua Exemplo 123",
      "1. DIAGNÓSTICO Transtorno do Espectro Autista.",
      "NeuroIntegrar Terapias Integradas Rua Exemplo 123",
      "2. DESCRIÇÃO DA DEMANDA Paciente encaminhado.",
      "NeuroIntegrar Terapias Integradas Rua Exemplo 123",
    ].join("\n");
    const normalizado = normalizarTextoExtraidoPdf(bruto);
    expect(normalizado.match(/NeuroIntegrar Terapias Integradas/g)?.length).toBe(1);
  });
});

describe("estruturarPlanoBasico", () => {
  it("cria seções e listas a partir do texto", () => {
    const html = estruturarPlanoBasico(
      "Objetivos:\nReduzir ansiedade social\n\nIntervenções:\n- Respiração diafragmática\n- Registro de pensamentos"
    );
    expect(html).toContain("<h3>Objetivos</h3>");
    expect(html).toContain("Reduzir ansiedade social");
    expect(html).toContain("<li>Respiração diafragmática</li>");
  });

  it("organiza plano clínico colado em seções e listas", () => {
    const bruto =
      "PLANO TERAPÊUTICO PSICOLÓGICO Hadryan Castro Reis 1. DIAGNÓSTICO Transtorno do Espectro Autista. 2. DESCRIÇÃO DA DEMANDA Paciente com dificuldades de interação. 4. OBJETIVOS ESPECÍFICOS 1. Desenvolver habilidades sociais 2. Promover regulação emocional 5. PROCEDIMENTOS E ESTRATÉGIAS DE INTERVENÇÃO a. Psicoeducação b. Treino de habilidades sociais";
    const html = estruturarPlanoBasico(bruto);
    expect(html).toContain("<h3>1. DIAGNÓSTICO</h3>");
    expect(html).toContain("<h3>2. DESCRIÇÃO DA DEMANDA</h3>");
    expect(html).toContain("<li>Desenvolver habilidades sociais</li>");
    expect(html).toContain("<li>Psicoeducação</li>");
    expect(html).not.toMatch(/<p>PLANO TERAPÊUTICO[\s\S]*10\. CRITÉRIOS<\/p>/);
  });

  it("organiza plano com listas entre parênteses", () => {
    const bruto =
      "PLANO TERAPÊUTICO PSICOLÓGICO Paciente: Hadryan Castro Reis 1. DIAGNÓSTICO Transtorno do Espectro Autista (TEA). 4. OBJETIVOS ESPECÍFICOS 1) Desenvolver habilidades sociais 2) Promover regulação emocional 5. PROCEDIMENTOS E ESTRATÉGIAS DE INTERVENÇÃO a) Psicoeducação b) Treino de habilidades sociais 10. CRITÉRIOS DE EVOLUÇÃO 1) Melhora na interação social 2) Redução de comportamentos disruptivos";
    const html = estruturarPlanoBasico(bruto);
    expect(html).toContain("<h3>PLANO TERAPÊUTICO PSICOLÓGICO");
    expect(html).toContain("<h3>1. DIAGNÓSTICO</h3>");
    expect(html).toContain("<h3>4. OBJETIVOS ESPECÍFICOS</h3>");
    expect(html).toContain("<li>Desenvolver habilidades sociais</li>");
    expect(html).toContain("<li>Psicoeducação</li>");
    expect(html).toContain("<h3>10. CRITÉRIOS DE EVOLUÇÃO</h3>");
    expect((html.match(/<h3>/g) || []).length).toBeGreaterThanOrEqual(4);
  });
});

describe("sanitizarHtmlPlanoImportado", () => {
  it("remove fences e scripts", () => {
    const html = sanitizarHtmlPlanoImportado(
      '```html\n<h3>Plano</h3><script>alert(1)</script><p>Meta</p>\n```'
    );
    expect(html).toContain("<h3>Plano</h3>");
    expect(html).not.toContain("script");
  });
});

describe("resumoPlanoImportado", () => {
  it("gera resumo curto", () => {
    const resumo = resumoPlanoImportado("<h3>Objetivo</h3><p>Trabalhar regulação emocional</p>", 30);
    expect(resumo.length).toBeLessThanOrEqual(31);
    expect(resumo).toContain("Trabalhar");
  });
});

describe("textoPdfTemConteudoUtil", () => {
  it("exige texto mínimo", () => {
    expect(textoPdfTemConteudoUtil("abc")).toBe(false);
    expect(textoPdfTemConteudoUtil("Plano terapêutico com metas claras para o tratamento")).toBe(true);
  });
});
