import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  hashPlanoParaCache,
  gravarLembretesSessaoCache,
  lerLembretesSessaoCache,
} from "./lembretes-sessao-cache";
import type { LembretesSessaoPlano } from "./plano-terapeutico-lembretes";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (chave: string) => store.get(chave) ?? null,
      setItem: (chave: string, valor: string) => {
        store.set(chave, valor);
      },
    },
  });
});

describe("hashPlanoParaCache", () => {
  it("é estável para o mesmo conteúdo", () => {
    const html = "<h3>Plano</h3><p>Conteúdo</p>";
    expect(hashPlanoParaCache(html)).toBe(hashPlanoParaCache(html));
  });

  it("muda quando o plano muda", () => {
    expect(hashPlanoParaCache("a")).not.toBe(hashPlanoParaCache("b"));
  });
});

describe("lembretes-sessao-cache sessionStorage", () => {
  const lembretes: LembretesSessaoPlano = {
    focoHoje: "Foco",
    lembretes: [{ tipo: "meta", texto: "Meta 1" }],
    usouIa: false,
    modo: "basico",
  };

  it("grava e lê lembretes por sessão e hash do plano", () => {
    const plano = "<h3>Objetivo</h3><p>Teste</p>";
    gravarLembretesSessaoCache({
      sessaoId: 42,
      planoConteudo: plano,
      lembretes,
    });

    expect(
      lerLembretesSessaoCache({
        sessaoId: 42,
        planoConteudo: plano,
      })
    ).toEqual(lembretes);
  });

  it("não encontra cache com plano diferente", () => {
    expect(
      lerLembretesSessaoCache({
        sessaoId: 42,
        planoConteudo: "<p>outro plano</p>",
      })
    ).toBeNull();
  });
});
