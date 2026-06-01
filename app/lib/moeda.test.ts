import { describe, expect, it } from "vitest";
import { parseValorBr } from "./moeda";

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
