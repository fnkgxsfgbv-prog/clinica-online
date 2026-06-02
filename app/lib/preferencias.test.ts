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
