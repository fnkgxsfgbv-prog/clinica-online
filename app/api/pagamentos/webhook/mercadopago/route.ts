import { NextResponse } from "next/server";

import { TABLES } from "../../../../lib/db/tables";
import { pagamentoMercadoPagoAprovado } from "../../../../lib/mercadopago-pix";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

export const runtime = "nodejs";

function extrairPaymentId(corpo: Record<string, unknown>) {
  const data = corpo.data as { id?: string | number } | undefined;
  if (data?.id != null) return String(data.id);
  if (corpo.id != null) return String(corpo.id);
  return "";
}

function extrairReferencia(corpo: Record<string, unknown>) {
  const data = corpo.data as { external_reference?: string } | undefined;
  return String(data?.external_reference || corpo.external_reference || "").trim();
}

function parseReferenciaSessao(referencia: string) {
  const match = referencia.match(/^psicodesk:([^:]+):sessao:(.+)$/);
  if (!match) return null;
  return { userId: match[1], sessaoId: match[2] };
}

export async function POST(request: Request) {
  let corpo: Record<string, unknown>;

  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const tipo = String(corpo.type || corpo.action || "").toLowerCase();
  if (tipo && !tipo.includes("payment")) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const paymentId = extrairPaymentId(corpo);
  const referenciaDireta = extrairReferencia(corpo);
  const parsed = parseReferenciaSessao(referenciaDireta);

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ ok: true, aviso: "service_role_ausente" });
  }

  let userId = parsed?.userId || "";
  let sessaoId = parsed?.sessaoId || "";
  let status = String(
    (corpo.data as { status?: string } | undefined)?.status ||
      corpo.status ||
      ""
  ).toLowerCase();

  if (paymentId && (!userId || !sessaoId)) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (token) {
      const resposta = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (resposta.ok) {
        const pagamento = (await resposta.json()) as Record<string, unknown>;
        status = String(pagamento.status || status).toLowerCase();
        const ref = String(pagamento.external_reference || "");
        const parsedRef = parseReferenciaSessao(ref);
        if (parsedRef) {
          userId = parsedRef.userId;
          sessaoId = parsedRef.sessaoId;
        }
      }
    }
  }

  if (!userId || !sessaoId) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  if (!pagamentoMercadoPagoAprovado(status)) {
    return NextResponse.json({ ok: true, status });
  }

  const { error } = await service
    .from(TABLES.SESSOES)
    .update({
      status_pagamento: "pago",
      forma_pagamento: "pix",
      pago_em: new Date().toISOString(),
      pagamento_referencia: paymentId || undefined,
    })
    .eq("user_id", userId)
    .eq("id", sessaoId);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "pago" });
}
