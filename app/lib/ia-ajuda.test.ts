import { describe, expect, it } from "vitest";

import { AJUDA_PRIVACIDADE_IA, AJUDA_SEGUIMENTO_SESSAO } from "./ia-ajuda";

describe("ia-ajuda", () => {
  it("expõe textos de seguimento e privacidade", () => {
    expect(AJUDA_SEGUIMENTO_SESSAO.length).toBeGreaterThan(2);
    expect(AJUDA_PRIVACIDADE_IA.some((item) => item.includes("nome completo"))).toBe(
      true
    );
  });
});
