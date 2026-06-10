import type { Evolucao, Sessao } from "../types";

export function obterRegistroAnotacoesSessao(
  evolucoes: Evolucao[],
  sessaoId: Sessao["id"]
) {
  return evolucoes.find(
    (item) =>
      String(item.sessao_id || "") === String(sessaoId) &&
      item.status_sessao === "anotacoes_sessao"
  );
}

export function temConteudoTexto(...valores: string[]) {
  return valores.some((valor) =>
    valor
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim()
  );
}

export function textoPlanoDeAnotacoes(registro?: Evolucao | null) {
  if (!registro) return "";
  return registro.observacoes || "";
}

export function ultimaEvolucaoClinica(
  evolucoes: Evolucao[],
  excluirSessaoId?: Sessao["id"]
) {
  const filtradas = evolucoes.filter((item) => {
    if (item.status_sessao === "anotacoes_sessao") return false;
    if (
      excluirSessaoId != null &&
      String(item.sessao_id || "") === String(excluirSessaoId)
    ) {
      return false;
    }
    return temConteudoTexto(
      item.queixa || "",
      item.objetivo || "",
      item.intervencao || "",
      item.observacoes || "",
      item.plano || "",
      item.encaminhamentos || ""
    );
  });

  filtradas.sort((a, b) => {
    const da = String(a.data || "");
    const db = String(b.data || "");
    if (da !== db) return db.localeCompare(da);
    return Number(b.id) - Number(a.id);
  });

  return filtradas[0] ?? null;
}

export function resumoCampoEvolucao(valor?: string | null, max = 220) {
  const texto = String(valor || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!texto) return "";
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max - 1)}…`;
}
