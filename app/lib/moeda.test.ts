import { describe, expect, it } from "vitest";
import { formatarMoedaChip, parseValorBr } from "./moeda";

describe("parseValorBr", () => {
  it("aceita número", () => {
    expect(parseValorBr(150)).toBe(150);
    expect(parseValorBr(0)).toBe(0);
  });

  it("aceita string pt-BR com vírgula", () => {
    expect(parseValorBr("150,50")).toBe(150.5);
    expect(parseValorBr("1.234,56")).toBe(1234.56);
  });

  it("aceita vazio e inválido como 0", () => {
    expect(parseValorBr("")).toBe(0);
    expect(parseValorBr(null)).toBe(0);
    expect(parseValorBr("abc")).toBe(0);
  });

  it("remove prefixo R$", () => {
    expect(parseValorBr("R$ 200,00")).toBe(200);
  });
});

describe("formatarMoedaChip", () => {
  it("formata valores compactos para chips", () => {
    expect(formatarMoedaChip(795)).toBe("R$795");
    expect(formatarMoedaChip(980)).toBe("R$980");
    expect(formatarMoedaChip(1200)).toBe("R$1,2k");
    expect(formatarMoedaChip(10000)).toBe("R$10k");
    expect(formatarMoedaChip(0)).toBe("R$0");
  });
});
