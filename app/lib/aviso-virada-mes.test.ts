import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  default: {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

import { criarAvisoViradaMes, textoAvisoViradaMes } from "./aviso-virada-mes";
import { AVISO_VIRADA_MES_KEY, PREFS_LOCAL_KEY } from "./preferencias";

const store: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  const localStorageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
  };
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("window", { localStorage: localStorageMock });
});

describe("criarAvisoViradaMes", () => {
  it("retorna null sem virada de mês", () => {
    expect(criarAvisoViradaMes(false, "2026-04", "2026-05")).toBeNull();
  });

  it("retorna null quando aviso está desligado nas preferências", () => {
    window.localStorage.setItem(
      PREFS_LOCAL_KEY,
      JSON.stringify({ avisoViradaMes: false })
    );
    expect(criarAvisoViradaMes(true, "2026-04", "2026-05")).toBeNull();
  });

  it("retorna null quando aviso já foi dispensado", () => {
    window.localStorage.setItem(
      PREFS_LOCAL_KEY,
      JSON.stringify({ avisoViradaMes: true })
    );
    window.localStorage.setItem(AVISO_VIRADA_MES_KEY, "2026-05");
    expect(criarAvisoViradaMes(true, "2026-04", "2026-05")).toBeNull();
  });

  it("monta aviso quando há virada e preferência ativa", () => {
    window.localStorage.setItem(
      PREFS_LOCAL_KEY,
      JSON.stringify({ avisoViradaMes: true, mesModo: "automatico" })
    );
    const aviso = criarAvisoViradaMes(true, "2026-04", "2026-05");
    expect(aviso).toEqual({ mesAnterior: "2026-04", mesAtual: "2026-05" });
    expect(textoAvisoViradaMes(aviso!)).toContain("Abril de 2026");
    expect(textoAvisoViradaMes(aviso!)).toContain("Maio de 2026");
  });
});
