import { describe, expect, it } from "vitest";
import {
  filtrarPendenciasChecklist,
  hrefPendencia,
  listarLinhasPendencia,
  montarChecklistUnificado,
  totalPendenciasChecklist,
} from "./checklist-clinica";
import type { Paciente, Sessao } from "../types";

const pacienteBase: Paciente = {
  id: "1",
  user_id: "u1",
  nome: "Ana",
  status: "ativo",
};

describe("montarChecklistUnificado", () => {
  it("conta cadastro incompleto", () => {
    const itens = montarChecklistUnificado(
      [{ ...pacienteBase, telefone: "" }],
      [],
      []
    );
    const semTelefone = itens.find((i) => i.id === "cadastro-sem-telefone");
    expect(semTelefone?.valor).toBe(1);
  });

  it("filtra pendências warn com valor > 0", () => {
    const itens = montarChecklistUnificado(
      [{ ...pacienteBase, telefone: "" }],
      [] as Sessao[],
      []
    );
    const pendencias = filtrarPendenciasChecklist(itens);
    expect(pendencias.length).toBeGreaterThan(0);
    expect(totalPendenciasChecklist(itens)).toBeGreaterThan(0);
  });

  it("aponta href da pendência para página filtrada", () => {
    const itens = montarChecklistUnificado(
      [{ ...pacienteBase, telefone: "" }],
      [],
      []
    );
    const semTelefone = itens.find((i) => i.id === "cadastro-sem-telefone");
    expect(semTelefone?.href).toBe(hrefPendencia("cadastro-sem-telefone"));
  });

  it("lista pacientes sem telefone", () => {
    const linhas = listarLinhasPendencia(
      "cadastro-sem-telefone",
      [{ ...pacienteBase, telefone: "" }],
      [],
      []
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.titulo).toBe("Ana");
    expect(linhas[0]?.href).toContain("/paciente/1/editar");
  });
});
