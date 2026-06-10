import { describe, expect, it } from "vitest";
import {
  erroColunaInexistente,
  extrairColunaProblematica,
  normalizarPacienteDb,
  sanitizarPayloadPacienteDb,
} from "./schema-fallback";

describe("erroColunaInexistente", () => {
  it("reconhece PGRST204", () => {
    expect(
      erroColunaInexistente({
        code: "PGRST204",
        message:
          "Could not find the 'valor_sessao' column of 'pacientes' in the schema cache",
      })
    ).toBe(true);
  });

  it("reconhece 42703", () => {
    expect(
      erroColunaInexistente({
        code: "42703",
        message: 'column pacientes.valor does not exist',
      })
    ).toBe(true);
  });
});

describe("extrairColunaProblematica", () => {
  it("extrai de PGRST204", () => {
    expect(
      extrairColunaProblematica({
        message:
          "Could not find the 'data_inicio_atendimento' column of 'pacientes' in the schema cache",
      })
    ).toBe("data_inicio_atendimento");
  });

  it("extrai de mensagem PostgreSQL", () => {
    expect(
      extrairColunaProblematica({
        message: 'column pacientes.valor does not exist',
      })
    ).toBe("valor");
  });
});

describe("normalizarPacienteDb", () => {
  it("copia valor legado para valor_sessao", () => {
    const p = normalizarPacienteDb({ id: 1, nome: "Ana", valor: "150" });
    expect(p.valor_sessao).toBe("150");
  });
});

describe("sanitizarPayloadPacienteDb", () => {
  it("remove campo valor do payload", () => {
    const out = sanitizarPayloadPacienteDb({
      nome: "Ana",
      valor: 100,
      valor_sessao: 150,
    });
    expect(out).toEqual({ nome: "Ana", valor_sessao: 150 });
  });
});
