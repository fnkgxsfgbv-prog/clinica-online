/** URL pública do PsicoDesk em produção (Vercel). */
export const PRODUCTION_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://clinica-online-ten.vercel.app";

/** Origem atual no browser ou produção no servidor. */
export function getSiteOrigin(fallbackOrigin?: string) {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return fallbackOrigin || PRODUCTION_SITE_URL;
}

export function loginRedirectPath(path = "/login/redefinir-senha") {
  return `${getSiteOrigin()}${path}`;
}
