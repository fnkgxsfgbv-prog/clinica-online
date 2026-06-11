import { describe, expect, it, afterEach } from "vitest";

import { iaNaNuvemDisponivel, iaClinicaAtiva, resolverConfigOpenAi } from "./openai-config";

describe("resolverConfigOpenAi", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
    delete process.env.VERCEL;
  });

  it("usa AI Gateway na Vercel com OIDC", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_OIDC_TOKEN = "oidc-token";
    const config = resolverConfigOpenAi();
    expect(config.baseUrl).toBe("https://ai-gateway.vercel.sh/v1");
    expect(config.apiKey).toBe("oidc-token");
    expect(config.model).toBe("openai/gpt-4o-mini");
  });

  it("usa OpenAI direto quando só há OPENAI_API_KEY", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const config = resolverConfigOpenAi();
    expect(config.baseUrl).toBe("https://api.openai.com/v1");
    expect(config.apiKey).toBe("sk-test");
    expect(config.model).toBe("gpt-4o-mini");
  });

  it("detecta ausência de credenciais", () => {
    expect(iaNaNuvemDisponivel()).toBe(false);
  });

  it("respeita preferência desligada", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(iaClinicaAtiva(true)).toBe(true);
    expect(iaClinicaAtiva(false)).toBe(false);
  });
});
