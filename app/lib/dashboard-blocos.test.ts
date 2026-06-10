import { describe, expect, it } from "vitest";
import {
  agruparBlocosDashboard,
  grupoPodeDescer,
  grupoPodeSubir,
  dashboardBlocoVisivel,
  moverBlocoDashboard,
  moverGrupoDashboard,
  normalizarDashboardBlocosOcultos,
  normalizarDashboardBlocosOrdem,
  ordemPadraoDashboard,
} from "./dashboard-blocos";

describe("dashboardBlocos", () => {
  it("filtra ids inválidos nos ocultos", () => {
    expect(
      normalizarDashboardBlocosOcultos(["pendencias", "invalido", "agenda-hoje"])
    ).toEqual(["pendencias", "agenda-hoje"]);
  });

  it("completa ordem com blocos novos", () => {
    const ordem = normalizarDashboardBlocosOrdem(["pendencias", "agenda-hoje"]);
    expect(ordem[0]).toBe("pendencias");
    expect(ordem).toEqual(expect.arrayContaining(ordemPadraoDashboard()));
    expect(ordem.length).toBe(ordemPadraoDashboard().length);
  });

  it("respeita blocos ocultos", () => {
    expect(
      dashboardBlocoVisivel("pendencias", ["pendencias", "aniversariantes"])
    ).toBe(false);
    expect(dashboardBlocoVisivel("agenda-hoje", ["pendencias"])).toBe(true);
  });

  it("move bloco para cima e para baixo", () => {
    const ordem = ordemPadraoDashboard();
    const depoisCima = moverBlocoDashboard(ordem, "pendencias", "up");
    expect(depoisCima.indexOf("pendencias")).toBe(
      ordem.indexOf("pendencias") - 1
    );

    const depoisBaixo = moverBlocoDashboard(ordem, "agenda-hoje", "down");
    expect(depoisBaixo.indexOf("agenda-hoje")).toBe(
      ordem.indexOf("agenda-hoje") + 1
    );
  });

  it("move grupo visual para cima e para baixo", () => {
    const ordem = ordemPadraoDashboard();
    const depoisBaixo = moverGrupoDashboard(ordem, [], "agenda-hoje", "down");
    expect(depoisBaixo.indexOf("agenda-hoje")).toBe(4);
    expect(depoisBaixo.slice(0, 4)).toEqual([
      "metric-pacientes",
      "metric-sessoes",
      "metric-comparecimento",
      "metric-receita",
    ]);

    const depoisCima = moverGrupoDashboard(
      depoisBaixo,
      [],
      "pendencias",
      "up"
    );
    expect(depoisCima.indexOf("pendencias")).toBeLessThan(
      depoisBaixo.indexOf("pendencias")
    );
  });

  it("indica limites de movimento por grupo", () => {
    const ordem = ordemPadraoDashboard();
    expect(grupoPodeSubir(ordem, [], "agenda-hoje")).toBe(false);
    expect(grupoPodeDescer(ordem, [], "aniversariantes")).toBe(false);
    expect(grupoPodeSubir(ordem, [], "pendencias")).toBe(true);
  });

  it("agrupa métricas consecutivas", () => {
    const ordem = [
      "agenda-hoje",
      "metric-pacientes",
      "metric-sessoes",
      "pendencias",
      "metric-receita",
    ] as const;
    const grupos = agruparBlocosDashboard(ordem, []);
    expect(grupos).toEqual([
      { tipo: "single", id: "agenda-hoje" },
      { tipo: "metrics", ids: ["metric-pacientes", "metric-sessoes"] },
      { tipo: "single", id: "pendencias" },
      { tipo: "metrics", ids: ["metric-receita"] },
    ]);
  });
});
