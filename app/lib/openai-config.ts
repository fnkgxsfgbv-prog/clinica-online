const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

export function resolverConfigOpenAi() {
  const aiGatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const baseUrlCustom = process.env.OPENAI_BASE_URL?.trim();

  const usarGateway =
    Boolean(baseUrlCustom?.includes("ai-gateway.vercel.sh")) ||
    Boolean(aiGatewayKey) ||
    Boolean(oidcToken) ||
    process.env.VERCEL === "1";

  const apiKey = aiGatewayKey || openAiKey || oidcToken || "";
  const baseUrl = usarGateway
    ? baseUrlCustom || AI_GATEWAY_BASE_URL
    : baseUrlCustom || "https://api.openai.com/v1";

  const modelConfigurado = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const model =
    usarGateway && !modelConfigurado.includes("/")
      ? `openai/${modelConfigurado}`
      : modelConfigurado;

  return {
    apiKey,
    baseUrl,
    model,
    usarGateway,
  };
}

export function iaNaNuvemDisponivel() {
  const { apiKey } = resolverConfigOpenAi();
  return Boolean(apiKey);
}

export function iaClinicaAtiva(usarIaClinica = true) {
  return usarIaClinica && iaNaNuvemDisponivel();
}
