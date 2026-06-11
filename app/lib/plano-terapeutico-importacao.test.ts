import { describe, expect, it } from "vitest";

import {
  estruturarPlanoBasico,
  resumoPlanoImportado,
  sanitizarHtmlPlanoImportado,
} from "./plano-terapeutico-importacao";
import { textoPdfTemConteudoUtil } from "./pdf/extrair-texto-plano-pdf";

describe("estruturarPlanoBasico", () => {
  it("cria seções e listas a partir do texto", () => {
    const html = estruturarPlanoBasico(
      "Objetivos:\nReduzir ansiedade social\n\nIntervenções:\n- Respiração diafragmática\n- Registro de pensamentos"
    );
    expect(html).toContain("<h3>Objetivos</h3>");
    expect(html).toContain("Reduzir ansiedade social");
    expect(html).toContain("<li>Respiração diafragmática</li>");
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
