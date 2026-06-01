import type { AuthError } from "@supabase/supabase-js";

import { PRODUCTION_SITE_URL } from "./site-url";

export function mensagemErroAuth(error: AuthError) {
  const msg = error.message?.toLowerCase() ?? "";

  if (
    error.name === "AuthRetryableFetchError" ||
    msg.includes("load failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("network")
  ) {
    return `Não foi possível conectar ao servidor. Verifique internet, VPN e bloqueadores. Use ${PRODUCTION_SITE_URL}/login`;
  }

  if (msg.includes("rate limit")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }

  return error.message || "Não foi possível concluir. Tente novamente.";
}

export function mensagemErroLogin(error: AuthError) {
  const msg = error.message?.toLowerCase() ?? "";

  if (
    error.name === "AuthRetryableFetchError" ||
    msg.includes("load failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("network")
  ) {
    return `Não foi possível conectar ao servidor de login. Use ${PRODUCTION_SITE_URL}/login`;
  }

  return "Email ou senha inválidos.";
}
