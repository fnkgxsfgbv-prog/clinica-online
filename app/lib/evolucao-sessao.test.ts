import { describe, expect, it } from "vitest";

import { resolverSessaoParaEvolucao } from "./evolucao-sessao";
import type { Evolucao, Sessao } from "../types";

describe("resolverSessaoParaEvolucao", () => {
  it("prioriza sessão recente sem evolução", () => {
    const sessoes: Sessao[] = [
      { id: "1", paciente_id: "p1", data: "2026-05-01", hora: "10:00" },
      { id: "2", paciente_id: "p1", data: "2026-05-10", hora: "10:00" },
    ];
    const evolucoes: Evolucao[] = [
      { id: "e1", sessao_id: "2", paciente_id: "p1" },
    ];

    expect(resolverSessaoParaEvolucao(sessoes, evolucoes)).toBe("1");
  });

  it("retorna null sem sessões", () => {
    expect(resolverSessaoParaEvolucao([], [])).toBeNull();
  });
});
