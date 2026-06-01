import { describe, expect, it } from "vitest";
import { valoresPacienteIdParaQuery } from "./paciente-id-query";

describe("valoresPacienteIdParaQuery", () => {
  it("número canônico retorna um valor", () => {
    expect(valoresPacienteIdParaQuery(5)).toEqual([5]);
    expect(valoresPacienteIdParaQuery("12")).toEqual([12]);
  });

  it("string com zeros à esquerda tenta número e string", () => {
    expect(valoresPacienteIdParaQuery("00012")).toEqual([12, "00012"]);
  });
});
