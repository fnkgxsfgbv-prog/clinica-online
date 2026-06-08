import { describe, expect, it } from "vitest";
import {
  calcularPrevisaoRecebimentoMes,
  statusSessaoFinanceiro,
} from "./financeiro-previsao";
import type { Frequencia, Paciente, Sessao } from "../types";

const paciente: Paciente = {
  id: 1,
  nome: "Ana",
  valor_sessao: "100",
};

describe("statusSessaoFinanceiro", () => {
  it("prioriza frequência sobre status da sessão", () => {
    const sessao: Sessao = {
      id: 1,
      paciente_id: 1,
      data: "2026-06-10",
      status: "Presente",
    };
    const freq: Frequencia = {
      id: 1,
      sessao_id: 1,
      paciente_id: 1,
      data: "2026-06-10",
      status: "Faltou",
    };

    expect(statusSessaoFinanceiro(sessao, freq)).toBe("faltou");
  });

  it("identifica cancelamento na sessão", () => {
    const sessao: Sessao = {
      id: 2,
      paciente_id: 1,
      data: "2026-06-12",
      status: "Cancelada",
    };

    expect(statusSessaoFinanceiro(sessao)).toBe("cancelada");
  });
});

describe("calcularPrevisaoRecebimentoMes", () => {
  it("soma confirmado com agendadas e desconta cancelamentos da previsão", () => {
    const sessoes: Sessao[] = [
      {
        id: 10,
        paciente_id: 1,
        paciente_nome: "Ana",
        data: "2026-06-05",
        status: "Presente",
        valor: 100,
      },
      {
        id: 11,
        paciente_id: 1,
        paciente_nome: "Ana",
        data: "2026-06-20",
        status: "Agendada",
        valor: 100,
      },
      {
        id: 12,
        paciente_id: 1,
        paciente_nome: "Ana",
        data: "2026-06-22",
        status: "Cancelada",
        valor: 100,
      },
    ];

    const frequencias: Frequencia[] = [
      {
        id: 1,
        sessao_id: 10,
        paciente_id: 1,
        data: "2026-06-05",
        status: "Presente",
      },
    ];

    const previsao = calcularPrevisaoRecebimentoMes(
      [paciente],
      frequencias,
      sessoes,
      "2026-06",
      "2026-06-15"
    );

    expect(previsao?.confirmado).toBe(100);
    expect(previsao?.agendado).toBe(100);
    expect(previsao?.cancelado).toBe(100);
    expect(previsao?.canceladoSessoes).toBe(1);
    expect(previsao?.previsaoTotal).toBe(200);
  });

  it("falta não entra na previsão", () => {
    const sessoes: Sessao[] = [
      {
        id: 20,
        paciente_id: 1,
        data: "2026-06-08",
        status: "Faltou",
        valor: 120,
      },
    ];

    const previsao = calcularPrevisaoRecebimentoMes(
      [paciente],
      [],
      sessoes,
      "2026-06",
      "2026-06-15"
    );

    expect(previsao?.confirmado).toBe(0);
    expect(previsao?.faltou).toBe(120);
    expect(previsao?.previsaoTotal).toBe(0);
  });
});
