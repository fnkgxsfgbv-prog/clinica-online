import type { User } from "@supabase/supabase-js";

export type ConfigPagamentoClinica = {
  chavePix: string;
  nomeRecebedorPix: string;
  cidadeRecebedorPix: string;
  mercadoPagoAtivo: boolean;
};

export function extrairConfigPagamento(
  metadata: Record<string, unknown> | null | undefined,
  fallbackNome = "Profissional",
  fallbackCidade = "BRASIL"
): ConfigPagamentoClinica {
  const meta = metadata || {};

  return {
    chavePix: String(meta.pix_key || meta.chave_pix || "").trim(),
    nomeRecebedorPix:
      String(meta.pix_receiver_name || meta.name || meta.full_name || fallbackNome).trim() ||
      fallbackNome,
    cidadeRecebedorPix:
      String(meta.pix_receiver_city || meta.clinic_city || fallbackCidade).trim() ||
      fallbackCidade,
    mercadoPagoAtivo: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()),
  };
}

export function extrairConfigPagamentoDeUsuario(
  user: User | null | undefined
): ConfigPagamentoClinica {
  return extrairConfigPagamento(user?.user_metadata || {});
}
