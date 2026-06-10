import { describe, expect, it } from "vitest";
import {
  obterRegistroAnotacoesSessao,
  ultimaEvolucaoClinica,
} from "./sessao-anotacoes";
import type { Evolucao } from "../types";

describe("ultimaEvolucaoClinica", () => {
  it("ignora anotacoes_sessao e retorna a evolução clínica mais recente", () => {
    const evolucoes: Evolucao[] = [
      {
        id: 1,
        sessao_id: 10,
        status_sessao: "anotacoes_sessao",
        observacoes: "rascunho",
        data: "2026-05-20",
      },
      {
        id: 2,
        sessao_id: 9,
        queixa: "Ansiedade",
        data: "2026-05-21",
      },
      {
        id: 3,
        sessao_id: 8,
        objetivo: "Mais antiga",
        data: "2026-05-01",
      },
    ];

    expect(ultimaEvolucaoClinica(evolucoes)?.id).toBe(2);
  });

  it("obterRegistroAnotacoesSessao encontra por sessao_id", () => {
    const evolucoes: Evolucao[] = [
      { id: 5, sessao_id: 42, status_sessao: "anotacoes_sessao", observacoes: "x" },
    ];
    expect(obterRegistroAnotacoesSessao(evolucoes, 42)?.id).toBe(5);
  });
});
