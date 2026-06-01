import { describe, expect, it } from "vitest";
import {
  criarDataLocalISO,
  dataIsoHoje,
  formatarDataHoraSessao,
  formatarDataPaciente,
  obterDataPrimeiraSessao,
} from "./datas-paciente";
import type { Sessao } from "../types";

describe("formatarDataPaciente", () => {
  it("formata ISO sem deslocar o dia (fuso local)", () => {
    expect(formatarDataPaciente("2026-05-20")).toBe("20/05/2026");
  });

  it("formata datetime do banco pela parte da data", () => {
    expect(formatarDataPaciente("2026-05-20T03:00:00.000Z")).toBe("20/05/2026");
  });

  it("formata data em pt-BR", () => {
    expect(formatarDataPaciente("03/04/2026")).toBe("03/04/2026");
  });

  it("nunca devolve ISO AAAA-MM-DD", () => {
    expect(formatarDataPaciente("2026-11-05")).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatarDataHoraSessao", () => {
  it("monta data e hora no padrão brasileiro", () => {
    expect(formatarDataHoraSessao("2026-11-05", "10:00")).toBe(
      "05/11/2026 às 10:00"
    );
  });
});

describe("criarDataLocalISO", () => {
  it("ignora horário UTC e mantém o dia civil", () => {
    const d = criarDataLocalISO("2026-05-20T03:00:00.000Z");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(20);
  });
});

describe("obterDataPrimeiraSessao", () => {
  it("não usa toISOString (evita dia anterior no Brasil)", () => {
    const sessoes = [
      { id: 1, data: "2026-05-20", hora: "10:00" },
      { id: 2, data: "2026-05-22", hora: "09:00" },
    ] as Sessao[];

    expect(obterDataPrimeiraSessao(sessoes)).toBe("20/05/2026");
  });
});

describe("dataIsoHoje", () => {
  it("usa calendário local, não UTC", () => {
    const agora = new Date();
    const esperado = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, "0"),
      String(agora.getDate()).padStart(2, "0"),
    ].join("-");

    expect(dataIsoHoje()).toBe(esperado);
  });
});
