import { describe, expect, it } from "vitest";
import {
  compararChaveMes,
  ordenarChavesMes,
  ordenarCronologico,
} from "./ordenar-datas";

describe("ordenarCronologico", () => {
  it("ordena do mais antigo ao mais recente (asc)", () => {
    const xs = [
      { id: 1, data: "2026-05-20", hora: "10:00" },
      { id: 2, data: "2026-05-18", hora: "14:00" },
      { id: 3, data: "19/05/2026", hora: "09:00" },
    ];
    const sorted = ordenarCronologico(xs, (x) => ({
      data: x.data,
      hora: x.hora,
    }));
    expect(sorted.map((x) => x.id)).toEqual([2, 3, 1]);
  });
});

describe("ordenarChavesMes", () => {
  it("ordena meses em ordem cronológica", () => {
    expect(
      ordenarChavesMes(["2026-03", "2026-01", "2026-02"], "asc")
    ).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("compararChaveMes coloca sem-data no fim em asc", () => {
    expect(compararChaveMes("sem-data", "2026-01", "asc")).toBeGreaterThan(0);
  });
});
