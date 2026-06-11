export type PixMercadoPagoResultado = {
  paymentId: string;
  status: string;
  copiaCola: string;
  qrCodeBase64: string;
  ticketUrl: string;
};

function tokenMercadoPago() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || "";
}

export function mercadoPagoConfigurado() {
  return Boolean(tokenMercadoPago());
}

export async function criarPixMercadoPago(params: {
  valor: number;
  descricao: string;
  emailPagador: string;
  referenciaExterna: string;
  idempotencyKey: string;
}): Promise<PixMercadoPagoResultado> {
  const token = tokenMercadoPago();
  if (!token) {
    throw new Error("Mercado Pago não configurado.");
  }

  if (params.valor <= 0) {
    throw new Error("Valor da cobrança deve ser maior que zero.");
  }

  const resposta = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: Number(params.valor.toFixed(2)),
      description: params.descricao.slice(0, 120),
      payment_method_id: "pix",
      payer: {
        email: params.emailPagador,
      },
      external_reference: params.referenciaExterna,
    }),
  });

  const corpo = (await resposta.json()) as Record<string, unknown>;

  if (!resposta.ok) {
    const mensagem =
      String(
        (corpo.message as string | undefined) ||
          (corpo.error as string | undefined) ||
          "Erro ao criar cobrança Pix."
      ) || "Erro ao criar cobrança Pix.";
    throw new Error(mensagem);
  }

  const interacao = corpo.point_of_interaction as
    | {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
          ticket_url?: string;
        };
      }
    | undefined;

  const dados = interacao?.transaction_data;

  return {
    paymentId: String(corpo.id || ""),
    status: String(corpo.status || "pending"),
    copiaCola: String(dados?.qr_code || ""),
    qrCodeBase64: String(dados?.qr_code_base64 || ""),
    ticketUrl: String(dados?.ticket_url || ""),
  };
}

export async function consultarPagamentoMercadoPago(paymentId: string) {
  const token = tokenMercadoPago();
  if (!token || !paymentId.trim()) return null;

  const resposta = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!resposta.ok) return null;

  const corpo = (await resposta.json()) as Record<string, unknown>;
  return {
    id: String(corpo.id || paymentId),
    status: String(corpo.status || ""),
    externalReference: String(corpo.external_reference || ""),
  };
}

export function pagamentoMercadoPagoAprovado(status: string) {
  return status.trim().toLowerCase() === "approved";
}
