import { describe, expect, it } from "vitest";
import {
  frequenciaPassaFiltroStatus,
  isStatusFaltou,
  visualFrequenciaAgenda,
} from "./status";

describe("visualFrequenciaAgenda", () => {
  it("trata Falta como faltou", () => {
    expect(visualFrequenciaAgenda("Falta").classeCalendario).toBe(
      "agenda-status-faltou"
    );
  });
});

describe("frequenciaPassaFiltroStatus", () => {
  it("filtra Falta no filtro Faltou", () => {
    expect(frequenciaPassaFiltroStatus("Faltou", "Falta")).toBe(true);
    expect(isStatusFaltou("Falta")).toBe(true);
  });
});
