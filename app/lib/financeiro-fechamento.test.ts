import { describe, expect, it } from "vitest";
import {
  calcularFechamentoMes,
  rotuloVariacao,
  totaisDeResumo,
  variacaoPercentual,
} from "./financeiro-fechamento";
import type { Frequencia, Paciente, Sessao } from "../types";

const paciente: Paciente = {
  id: 1,
  nome: "Ana",
  valor_sessao: "100",
};

describe("financeiro-fechamento", () => {
  it("totaisDeResumo soma linhas", () => {
    const t = totaisDeResumo([
      {
        id: 1,
        nome: "Ana",
        presencas: 2,
        valor: 100,
        total: 200,
        totalRecebido: 100,
        totalPendente: 100,
        formasPagamento: [],
      },
    ]);
    expect(t.total).toBe(200);
    expect(t.presencas).toBe(2);
  });

  it("calcularFechamentoMes filtra por mês e traz anterior", () => {
    const frequencias: Frequencia[] = [
      {
        id: 1,
        paciente_id: 1,
        paciente_nome: "Ana",
        data: "2026-05-10",
        status: "Presente",
      },
      {
        id: 2,
        paciente_id: 1,
        paciente_nome: "Ana",
        data: "2026-04-10",
        status: "Presente",
      },
    ];
    const fechamento = calcularFechamentoMes([paciente], frequencias, [], "2026-05");
    expect(fechamento?.totais.presencas).toBe(1);
    expect(fechamento?.totaisAnterior?.presencas).toBe(1);
    expect(fechamento?.labelMesAnterior).toBe("Abril de 2026");
  });

  it("variacaoPercentual e rotulo", () => {
    expect(variacaoPercentual(110, 100)).toBeCloseTo(10);
    expect(rotuloVariacao(110, 100)).toBe("+10,0%");
  });
});
