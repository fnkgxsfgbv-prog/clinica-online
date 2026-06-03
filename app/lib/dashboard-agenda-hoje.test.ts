import { describe, expect, it } from "vitest";

import {
  agruparProximasSessoes,
  proximaSessaoHojeId,
  resumoDia,
  rotuloResumoDia,
} from "./dashboard-agenda-hoje";
import type { Sessao } from "../types";

function sessao(
  id: number,
  hora: string,
  status = "Agendada"
): Sessao {
  return {
    id,
    user_id: "u1",
    paciente_id: id,
    paciente_nome: `Paciente ${id}`,
    data: "2026-05-26",
    hora,
    valor: 100,
    status,
  };
}

describe("resumoDia", () => {
  it("conta presentes e agendadas", () => {
    const resumo = resumoDia([
      sessao(1, "09:00", "Presente"),
      sessao(2, "10:00", "Agendada"),
    ]);

    expect(resumo).toEqual({ presentes: 1, faltas: 0, agendadas: 1 });
  });
});

describe("rotuloResumoDia", () => {
  it("mostra dia concluído quando todas presentes", () => {
    const resumo = resumoDia([
      sessao(1, "09:00", "Presente"),
      sessao(2, "10:00", "Presente"),
    ]);

    expect(rotuloResumoDia(resumo, 2)).toEqual([
      { key: "total", label: "2 sessões" },
      { key: "done", label: "Dia concluído", className: "is-present" },
    ]);
  });
});

describe("proximaSessaoHojeId", () => {
  it("ignora sessões já marcadas como presente", () => {
    const id = proximaSessaoHojeId(
      [
        sessao(1, "09:00", "Presente"),
        sessao(2, "10:00", "Presente"),
        sessao(3, "19:00", "Presente"),
      ],
      "18:00"
    );

    expect(id).toBeNull();
  });

  it("retorna a próxima sessão agendada", () => {
    const id = proximaSessaoHojeId(
      [
        sessao(1, "09:00", "Presente"),
        sessao(2, "18:00", "Agendada"),
        sessao(3, "19:00", "Agendada"),
      ],
      "17:30"
    );

    expect(id).toBe(2);
  });
});

describe("agruparProximasSessoes", () => {
  it("exclui hoje e agrupa por dia", () => {
    const grupos = agruparProximasSessoes(
      [
        { ...sessao(1, "09:00"), data: "2026-05-26" },
        { ...sessao(2, "10:00"), data: "2026-05-27" },
        { ...sessao(3, "14:00"), data: "2026-05-27" },
        { ...sessao(4, "11:00"), data: "2026-05-29" },
      ],
      "2026-05-26",
      8
    );

    expect(grupos).toHaveLength(2);
    expect(grupos[0].titulo).toBe("Amanhã");
    expect(grupos[0].sessoes).toHaveLength(2);
    expect(grupos[1].sessoes).toHaveLength(1);
  });

  it("respeita limite total de sessões", () => {
    const grupos = agruparProximasSessoes(
      [
        { ...sessao(1, "09:00"), data: "2026-05-27" },
        { ...sessao(2, "10:00"), data: "2026-05-27" },
        { ...sessao(3, "11:00"), data: "2026-05-28" },
      ],
      "2026-05-26",
      2
    );

    expect(grupos.flatMap((g) => g.sessoes)).toHaveLength(2);
  });
});
