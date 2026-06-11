import { describe, expect, it } from "vitest";

import {
  extrairSecoesPlanoHtml,
  gerarLembretesBasicos,
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
  });
});

describe("rotuloTipoLembrete", () => {
  it("traduz tipos", () => {
    expect(rotuloTipoLembrete("meta")).toBe("Meta");
    expect(rotuloTipoLembrete("tecnica")).toBe("Técnica");
  });
});
