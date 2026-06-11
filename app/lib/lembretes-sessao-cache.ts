import type {
  FinalidadeSugestaoPlano,
  LembretesSessaoPlano,
} from "./plano-terapeutico-lembretes";

const PREFIXO = "psicodesk-lembretes";

export function hashPlanoParaCache(conteudo: string): string {
  let hash = 5381;
  const texto = String(conteudo || "");
  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash * 33) ^ texto.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function chaveCache(
  finalidade: FinalidadeSugestaoPlano,
  sessaoId: string | number,
  planoHash: string
) {
  return `${PREFIXO}:${finalidade}:${sessaoId}:${planoHash}`;
}

export function lerLembretesSessaoCache({
  finalidade,
  sessaoId,
  planoConteudo,
}: {
  finalidade: FinalidadeSugestaoPlano;
  sessaoId: string | number;
  planoConteudo: string;
}): LembretesSessaoPlano | null {
  if (typeof window === "undefined") return null;

  try {
    const hash = hashPlanoParaCache(planoConteudo);
    const raw = window.sessionStorage.getItem(chaveCache(finalidade, sessaoId, hash));
    if (!raw) return null;
    return JSON.parse(raw) as LembretesSessaoPlano;
  } catch {
    return null;
  }
}

export function gravarLembretesSessaoCache({
  finalidade,
  sessaoId,
  planoConteudo,
  lembretes,
}: {
  finalidade: FinalidadeSugestaoPlano;
  sessaoId: string | number;
  planoConteudo: string;
  lembretes: LembretesSessaoPlano;
}): void {
  if (typeof window === "undefined") return;

  try {
    const hash = hashPlanoParaCache(planoConteudo);
    window.sessionStorage.setItem(
      chaveCache(finalidade, sessaoId, hash),
      JSON.stringify(lembretes)
    );
  } catch {
    /* quota / private mode */
  }
}
