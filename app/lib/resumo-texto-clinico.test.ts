import { describe, expect, it } from "vitest";

import {
  planoTerapeuticoTemConteudo,
  resumoTextoClinico,
} from "./resumo-texto-clinico";

describe("resumoTextoClinico", () => {
  it("remove tags html e limita tamanho", () => {
    const html = "<p>Meta principal</p><p>Segunda linha longa " + "x".repeat(300) + "</p>";
    const resumo = resumoTextoClinico(html, 40);
    expect(resumo.endsWith("…")).toBe(true);
    expect(resumo).toContain("Meta principal");
    expect(resumo).not.toContain("<p>");
  });
});

describe("planoTerapeuticoTemConteudo", () => {
  it("detecta conteúdo útil", () => {
    expect(planoTerapeuticoTemConteudo("")).toBe(false);
    expect(planoTerapeuticoTemConteudo("<p> </p>")).toBe(false);
    expect(planoTerapeuticoTemConteudo("<p>Fase 1</p>")).toBe(true);
  });
});
