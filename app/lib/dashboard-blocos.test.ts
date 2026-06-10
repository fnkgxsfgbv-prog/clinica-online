import { describe, expect, it } from "vitest";
import {
  dashboardBlocoVisivel,
  normalizarDashboardBlocosOcultos,
} from "./dashboard-blocos";

describe("dashboardBlocos", () => {
  it("filtra ids inválidos", () => {
    expect(
      normalizarDashboardBlocosOcultos(["pendencias", "invalido", "agenda-hoje"])
    ).toEqual(["pendencias", "agenda-hoje"]);
  });

  it("respeita blocos ocultos", () => {
    expect(
      dashboardBlocoVisivel("pendencias", ["pendencias", "aniversariantes"])
    ).toBe(false);
    expect(dashboardBlocoVisivel("agenda-hoje", ["pendencias"])).toBe(true);
  });
});
