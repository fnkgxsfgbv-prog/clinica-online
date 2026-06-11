import { afterEach, describe, expect, it, vi } from "vitest";

import { chamarModeloClinico } from "./ia-client";

vi.mock("./openai-config", () => ({
  resolverConfigOpenAi: vi.fn(() => ({
    apiKey: "test-key",
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    model: "openai/gpt-4o-mini",
    usarGateway: true,
  })),
}));

describe("chamarModeloClinico", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna conteúdo da resposta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"focoHoje":"Teste"}' } }],
        }),
      }))
    );

    const resposta = await chamarModeloClinico({
      responseFormat: "json_object",
      messages: [{ role: "user", content: "oi" }],
    });

    expect(resposta).toContain("focoHoje");
  });

  it("faz retry e cai no fallback de erro", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: "indisponível" } }),
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      chamarModeloClinico({
        messages: [{ role: "user", content: "oi" }],
      })
    ).rejects.toThrow("indisponível");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
