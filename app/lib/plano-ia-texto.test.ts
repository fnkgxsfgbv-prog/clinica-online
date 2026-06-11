import { describe, expect, it } from "vitest";

import type { Evolucao } from "../types";
import {
  iniciaisParaIa,
  prepararTextoPdfParaIa,
  prepararTextoPlanoParaIa,
  resumoEvolucaoParaIa,
  stripHtmlParaIa,
} from "./plano-ia-texto";

describe("iniciaisParaIa", () => {
  it("gera iniciais sem nome completo", () => {
    expect(iniciaisParaIa("Maria Silva Santos")).toBe("M.S.");
    expect(iniciaisParaIa("João")).toBe("J.");
    expect(iniciaisParaIa("")).toBe("");
  });
});

describe("stripHtmlParaIa", () => {
  it("remove tags e limita tamanho", () => {
    const html = "<p>Texto <strong>clínico</strong></p>";
    expect(stripHtmlParaIa(html)).toBe("Texto clínico");
    expect(stripHtmlParaIa("a".repeat(20), 5)).toBe("aaaaa…");
  });
});

describe("prepararTextoPlanoParaIa", () => {
  it("trunca planos longos", () => {
    const longo = "x".repeat(20_000);
    expect(prepararTextoPlanoParaIa(longo, 100)).toHaveLength(101);
  });
});

describe("prepararTextoPdfParaIa", () => {
  it("prioriza seções numeradas iniciais", () => {
    const linhas = [
      "1. DIAGNÓSTICO",
      "Conteúdo da seção 1",
      "2. DEMANDA",
      "Conteúdo da seção 2",
    ];
    const texto = linhas.join("\n").repeat(500);
    const preparado = prepararTextoPdfParaIa(texto, 800);
    expect(preparado.length).toBeLessThanOrEqual(800);
    expect(preparado).toContain("1. DIAGNÓSTICO");
  });
});

describe("resumoEvolucaoParaIa", () => {
  it("monta resumo a partir dos campos clínicos", () => {
    const evolucao: Evolucao = {
      id: 1,
      queixa: "Ansiedade",
      objetivo: "Regulação emocional",
      intervencao: "Psicoeducação",
    };
    const resumo = resumoEvolucaoParaIa(evolucao);
    expect(resumo).toContain("Ansiedade");
    expect(resumo).toContain("Regulação emocional");
  });
});
