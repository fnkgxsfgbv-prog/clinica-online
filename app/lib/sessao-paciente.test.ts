import { describe, expect, it } from "vitest";

import { agruparSessoesPaciente, classificarSessaoPaciente } from "./sessao-paciente";
import type { Sessao } from "../types";

const agora = new Date("2026-05-15T12:00:00").getTime();

describe("classificarSessaoPaciente", () => {
  it("separa futuras, realizadas e canceladas", () => {
    const sessoes: Sessao[] = [
      { id: "1", paciente_id: "p", data: "2026-05-10", hora: "10:00", status: "Presente" },
      { id: "2", paciente_id: "p", data: "2026-05-20", hora: "10:00", status: "Agendada" },
      { id: "3", paciente_id: "p", data: "2026-05-08", hora: "10:00", status: "Cancelada" },
    ];

    expect(classificarSessaoPaciente(sessoes[0], agora)).toBe("realizadas");
    expect(classificarSessaoPaciente(sessoes[1], agora)).toBe("futuras");
    expect(classificarSessaoPaciente(sessoes[2], agora)).toBe("canceladas");

    const grupos = agruparSessoesPaciente(sessoes, agora);
    expect(grupos.realizadas).toHaveLength(1);
    expect(grupos.futuras).toHaveLength(1);
    expect(grupos.canceladas).toHaveLength(1);
  });
});
