export const AVISO_IA_INDISPONIVEL =
  "IA indisponível no momento. Mostrando resumo automático do plano.";

export const LABEL_LEMBRETES_IA = "Sugerido com IA";
export const LABEL_LEMBRETES_BASICO = "Resumo automático";

export const TEXTO_PRIVACIDADE_IA =
  "Com a IA ativada, trechos do plano terapêutico (e, opcionalmente, resumo da última evolução) são enviados de forma segura à Vercel AI Gateway para organização e lembretes. Não incluímos o nome completo do paciente nesses envios. Não substituem julgamento clínico. Você pode desativar a qualquer momento em Minha clínica.";

export function rotuloModoLembretes(modo: "ia" | "basico") {
  return modo === "ia" ? LABEL_LEMBRETES_IA : LABEL_LEMBRETES_BASICO;
}
