import type { User } from "@supabase/supabase-js";

export type DadosClinica = {
  nomeProfissional: string;
  nomeClinica: string;
  crp: string;
  telefone: string;
  endereco: string;
  cidade: string;
  observacoes: string;
};

export function dadosClinicaPadrao(): DadosClinica {
  return {
    nomeProfissional: "Profissional",
    nomeClinica: "PsicoDesk",
    crp: "",
    telefone: "",
    endereco: "",
    cidade: "",
    observacoes: "",
  };
}

export function extrairDadosClinica(
  metadata: Record<string, unknown> | null | undefined
): DadosClinica {
  const padrao = dadosClinicaPadrao();
  if (!metadata) return padrao;

  return {
    nomeProfissional:
      String(metadata.name || metadata.full_name || "").trim() ||
      padrao.nomeProfissional,
    nomeClinica: String(metadata.clinic_name || padrao.nomeClinica).trim(),
    crp: String(metadata.crp || "").trim(),
    telefone: String(metadata.phone || "").trim(),
    endereco: String(metadata.clinic_address || "").trim(),
    cidade: String(metadata.clinic_city || "").trim(),
    observacoes: String(metadata.clinic_notes || "").trim(),
  };
}

export function extrairDadosClinicaDeUsuario(user: User | null | undefined): DadosClinica {
  return extrairDadosClinica(user?.user_metadata || {});
}

export function rotuloRodapeClinica(dados: DadosClinica): string {
  const partes = [
    dados.nomeProfissional,
    dados.crp ? dados.crp : "",
    dados.nomeClinica,
    dados.cidade,
  ].filter(Boolean);

  return partes.join(" • ");
}

export function preencherVariaveisClinica(
  conteudo: string,
  dados: DadosClinica
): string {
  return conteudo
    .replaceAll("{{clinica_nome}}", dados.nomeClinica)
    .replaceAll("{{profissional_nome}}", dados.nomeProfissional)
    .replaceAll("{{profissional_crp}}", dados.crp)
    .replaceAll("{{clinica_telefone}}", dados.telefone)
    .replaceAll("{{clinica_endereco}}", dados.endereco)
    .replaceAll("{{clinica_cidade}}", dados.cidade)
    .replaceAll("{{clinica_observacoes}}", dados.observacoes);
}
