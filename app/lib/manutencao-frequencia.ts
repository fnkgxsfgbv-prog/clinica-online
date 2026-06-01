const CHAVE_SESSAO = "psicodesk-freq-manut";

/** Evita rodar sync/reparo pesado em todo carregamento (1x por aba/sessão do browser). */
export function deveExecutarManutencaoFrequencia(userId: string): boolean {
  if (typeof sessionStorage === "undefined") return true;
  return sessionStorage.getItem(`${CHAVE_SESSAO}:${userId}`) !== "1";
}

export function marcarManutencaoFrequenciaExecutada(userId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${CHAVE_SESSAO}:${userId}`, "1");
}

export function limparFlagManutencaoFrequencia(userId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(`${CHAVE_SESSAO}:${userId}`);
}
