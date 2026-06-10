import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  default: {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

import {
  DASHBOARD_LAYOUT_KEY,
  gravarLayoutDashboardLocal,
  lerLayoutDashboardLocal,
  mesclarPreferencias,
  preferenciasPadrao,
  lerPreferenciasDeMetadata,
  PREFS_METADATA_KEY,
} from "./preferencias";

describe("preferenciasPadrao", () => {
  it("retorna valores padrão esperados", () => {
    const prefs = preferenciasPadrao();
    expect(prefs.tema).toBe("dark");
    expect(prefs.mesModo).toBe("automatico");
    expect(prefs.duracaoSessaoMinutos).toBe(50);
    expect(prefs.agendaVisualizacao).toBe("week");
  });
});

describe("mesclarPreferencias", () => {
  it("normaliza tema e duração inválida", () => {
    const prefs = mesclarPreferencias({
      tema: "light",
      duracaoSessaoMinutos: 999,
      mesUltimo: "2026-05",
    });
    expect(prefs.tema).toBe("light");
    expect(prefs.duracaoSessaoMinutos).toBe(50);
    expect(prefs.mesUltimo).toBe("2026-05");
  });

  it("aceita tema system", () => {
    const prefs = mesclarPreferencias({ tema: "system" });
    expect(prefs.tema).toBe("system");
  });
});

describe("lerPreferenciasDeMetadata", () => {
  it("lê objeto aninhado no metadata", () => {
    const prefs = lerPreferenciasDeMetadata({
      [PREFS_METADATA_KEY]: {
        tema: "light",
        mesModo: "ultimo",
        valorSessaoPadrao: "200",
      },
    });
    expect(prefs.tema).toBe("light");
    expect(prefs.mesModo).toBe("ultimo");
    expect(prefs.valorSessaoPadrao).toBe("200");
  });
});

describe("layoutDashboardLocal", () => {
  it("preserva ordem local sobre metadata desatualizada", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });

    gravarLayoutDashboardLocal({
      dashboardBlocosOcultos: [],
      dashboardBlocosOrdem: [
        "pendencias",
        "agenda-hoje",
        "metric-pacientes",
        "metric-sessoes",
        "metric-comparecimento",
        "metric-receita",
        "proximas-sessoes",
        "aniversariantes",
      ],
    });

    const daNuvem = lerPreferenciasDeMetadata({
      [PREFS_METADATA_KEY]: preferenciasPadrao(),
    });
    const layoutLocal = lerLayoutDashboardLocal();
    const mesclado = mesclarPreferencias({
      ...daNuvem,
      ...(layoutLocal ?? {}),
    });

    expect(mesclado.dashboardBlocosOrdem[0]).toBe("pendencias");
    expect(storage.has(DASHBOARD_LAYOUT_KEY)).toBe(true);

    vi.unstubAllGlobals();
  });
});
