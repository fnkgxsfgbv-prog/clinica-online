import { describe, expect, it } from "vitest";
import { labelMesAno, mesAnteriorChave, NOME_MES_PT } from "./mes";

describe("labelMesAno", () => {
  it("retorna todos os meses para string vazia", () => {
    expect(labelMesAno("")).toBe("Todos os meses");
  });

  it("formata AAAA-MM", () => {
    expect(labelMesAno("2026-03")).toBe("Março de 2026");
    expect(labelMesAno("2026-10")).toBe("Outubro de 2026");
  });

  it("trata sem-data", () => {
    expect(labelMesAno("sem-data")).toBe("Sem data");
  });
});

describe("mesAnteriorChave", () => {
  it("retrocede um mês", () => {
    expect(mesAnteriorChave("2026-05")).toBe("2026-04");
    expect(mesAnteriorChave("2026-01")).toBe("2025-12");
  });
});

describe("NOME_MES_PT", () => {
  it("tem 12 meses", () => {
    expect(Object.keys(NOME_MES_PT).length).toBe(12);
  });
});
