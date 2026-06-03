import { describe, expect, it } from "vitest";
import {
  calcularResumoFinanceiro,
  dataReferenciaISO,
  filtrarPorIntervaloDatas,
  filtrarPorMesReferencia,
  filtrarPorSemanaReferencia,
  inicioSemanaISO,
  labelSemana,
  semanaIntersectsMes,
} from "./financeiro";
import type { Frequencia, Paciente, Sessao } from "../types";

describe("filtrarPorMesReferencia", () => {
  it("sem mês retorna tudo", () => {
    const xs = [{ data: "2026-03-15" }, { data: "2026-04-01" }];
    expect(filtrarPorMesReferencia(xs, "").length).toBe(2);
  });

  it("filtra por AAAA-MM", () => {
    const xs = [{ data: "2026-03-15" }, { data: "2026-04-01" }];
    expect(filtrarPorMesReferencia(xs, "2026-03")).toEqual([{ data: "2026-03-15" }]);
  });
});

describe("dataReferenciaISO e filtrarPorIntervaloDatas", () => {
  it("normaliza ISO e BR", () => {
    expect(dataReferenciaISO("2026-04-02")).toBe("2026-04-02");
    expect(dataReferenciaISO("2026-04-02T10:00")).toBe("2026-04-02");
    expect(dataReferenciaISO("03/04/2026")).toBe("2026-04-03");
  });

  it("intervalo inclusivo e inverte se início > fim", () => {
    const xs = [
      { data: "2026-03-01" },
      { data: "2026-03-15" },
      { data: "2026-04-01" },
    ];
    expect(filtrarPorIntervaloDatas(xs, "2026-03-10", "2026-03-01")).toEqual([
      { data: "2026-03-01" },
    ]);
  });
});

describe("semanaIntersectsMes", () => {
  it("cruza mês da segunda ou do domingo", () => {
    expect(semanaIntersectsMes("2026-04-28", "2026-04")).toBe(true);
    expect(semanaIntersectsMes("2026-04-28", "2026-05")).toBe(true);
    expect(semanaIntersectsMes("2026-05-18", "2026-05")).toBe(true);
    expect(semanaIntersectsMes("2026-05-18", "2026-04")).toBe(false);
  });
});

describe("inicioSemanaISO, filtrarPorSemanaReferencia e labelSemana", () => {
  it("calcula segunda-feira da semana ISO", () => {
    expect(inicioSemanaISO("2026-05-25")).toBe("2026-05-25");
    expect(inicioSemanaISO("2026-05-24")).toBe("2026-05-18");
    expect(inicioSemanaISO("2026-05-18")).toBe("2026-05-18");
  });

  it("filtra segunda a domingo", () => {
    const xs = [
      { data: "2026-05-17" },
      { data: "2026-05-18" },
      { data: "2026-05-24" },
      { data: "2026-05-25" },
    ];
    expect(filtrarPorSemanaReferencia(xs, "2026-05-18")).toEqual([
      { data: "2026-05-18" },
      { data: "2026-05-24" },
    ]);
  });

  it("formata rótulo da semana", () => {
    expect(labelSemana("2026-05-18")).toBe("18–24/05/2026");
    expect(labelSemana("2026-05-29")).toBe("29/05–04/06/2026");
    expect(labelSemana("2026-05-18", { curto: true })).toBe("18–24/05");
    expect(labelSemana("2026-05-29", { curto: true })).toBe("29/05–4/06");
  });
});

describe("calcularResumoFinanceiro", () => {
  const paciente: Paciente = {
    id: 1,
    nome: "Ana",
    valor_sessao: "100",
  };

  it("presença com sessão soma no total faturado", () => {
    const sessao: Sessao = {
      id: 10,
      paciente_id: 1,
      paciente_nome: "Ana",
      data: "2026-05-10",
      status: "Presente",
      valor: 100,
    };
    const freq: Frequencia = {
      id: 1,
      sessao_id: 10,
      paciente_id: 1,
      paciente_nome: "Ana",
      data: "2026-05-10",
      status: "Presente",
    };

    const [r] = calcularResumoFinanceiro([paciente], [freq], [sessao]);
    expect(r.presencas).toBe(1);
    expect(r.total).toBe(100);
  });

  it("falta na frequência não conta mesmo com sessão ainda como Presente", () => {
    const sessao: Sessao = {
      id: 30,
      paciente_id: 1,
      paciente_nome: "Arthur Peixoto",
      data: "2026-05-15",
      status: "Presente",
      valor: 150,
    };
    const freq: Frequencia = {
      id: 5,
      sessao_id: 30,
      paciente_id: 1,
      paciente_nome: "Arthur Peixoto",
      data: "2026-05-15",
      status: "Faltou",
    };

    expect(calcularResumoFinanceiro([paciente], [freq], [sessao])).toEqual([]);
  });

  it("duplicata antiga Presente + Faltou recente conta só falta", () => {
    const sessao: Sessao = {
      id: 31,
      paciente_id: 1,
      data: "2026-05-16",
      status: "Presente",
      valor: 100,
    };
    const freqAntiga: Frequencia = {
      id: 1,
      sessao_id: 31,
      paciente_id: 1,
      data: "2026-05-16",
      status: "Presente",
    };
    const freqNova: Frequencia = {
      id: 9,
      sessao_id: 31,
      paciente_id: 1,
      data: "2026-05-16",
      status: "Faltou",
    };

    expect(
      calcularResumoFinanceiro([paciente], [freqAntiga, freqNova], [sessao])
    ).toEqual([]);
  });

  it("status Falta é tratado como faltou", () => {
    const freq: Frequencia = {
      id: 3,
      paciente_id: 1,
      paciente_nome: "Ana",
      data: "2026-05-12",
      status: "Falta",
    };

    expect(calcularResumoFinanceiro([paciente], [freq], [])).toEqual([]);
  });

  it("falta sem sessao_id bloqueia contagem da sessão presente no mesmo dia", () => {
    const sessao: Sessao = {
      id: 40,
      paciente_id: 1,
      paciente_nome: "Ana",
      data: "2026-05-20",
      status: "Presente",
      valor: 100,
    };
    const freq: Frequencia = {
      id: 8,
      paciente_id: 1,
      paciente_nome: "Ana",
      data: "2026-05-20",
      status: "Faltou",
    };

    expect(calcularResumoFinanceiro([paciente], [freq], [sessao])).toEqual([]);
  });

  it("sessão presente sem linha na frequência entra no resumo", () => {
    const sessao: Sessao = {
      id: 20,
      paciente_id: 1,
      data: "2026-06-01",
      status: "Presente",
      valor: 120,
    };

    const [r] = calcularResumoFinanceiro([paciente], [], [sessao]);
    expect(r.presencas).toBe(1);
    expect(r.total).toBe(120);
  });
});
