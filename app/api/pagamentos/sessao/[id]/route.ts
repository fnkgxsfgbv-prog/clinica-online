import { NextResponse } from "next/server";

import {
  carregarSessaoDoUsuario,
  respostaErro,
} from "../../_helpers";
import { valoresPacienteIdParaQuery } from "../../../../lib/db/paciente-id-query";
import { TABLES } from "../../../../lib/db/tables";
import {
  consultarPagamentoMercadoPago,
  criarPixMercadoPago,
  mercadoPagoConfigurado,
  pagamentoMercadoPagoAprovado,
} from "../../../../lib/mercadopago-pix";
import { extrairConfigPagamentoDeUsuario } from "../../../../lib/pagamento-config";
import {
  referenciaPagamentoSessao,
  valorCobrancaSessao,
} from "../../../../lib/pagamento-sessao";
import { gerarPixCopiaCola } from "../../../../lib/pix-brcode";
import { erroColunaInexistente } from "../../../../lib/db/schema-fallback";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import type { Paciente, Sessao } from "../../../../types";

export const runtime = "nodejs";

const ERRO_MIGRATION_PAGAMENTO =
  "Pagamentos ainda não estão ativos no banco. Rode npm run db:apply-pagamento e tente de novo.";

async function salvarCobrancaSessao(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  sessaoId: Sessao["id"],
  payload: Record<string, unknown>
) {
  return supabase
    .from(TABLES.SESSOES)
    .update(payload)
    .eq("user_id", userId)
    .eq("id", sessaoId);
}

function erroSalvarCobranca(error: { message?: string; code?: string } | null) {
  if (!error) return null;
  if (erroColunaInexistente(error)) return ERRO_MIGRATION_PAGAMENTO;
  return "Erro ao salvar cobrança: " + (error.message || "tente novamente.");
}

async function carregarPaciente(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  pacienteId: string | number
) {
  const candidatos = valoresPacienteIdParaQuery(pacienteId);
  const tentativas = candidatos.length > 0 ? candidatos : [pacienteId];

  for (const id of tentativas) {
    const { data, error } = await supabase
      .from(TABLES.PACIENTES)
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) return { ok: false as const, erro: error.message };
    if (data) return { ok: true as const, paciente: data as Paciente };
  }

  return { ok: true as const, paciente: null };
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessaoId = String(id || "").trim();
  if (!sessaoId) return respostaErro("Sessão inválida.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return respostaErro("Sessão expirada. Faça login novamente.", 401);
  }

  const carregada = await carregarSessaoDoUsuario(sessaoId, user.id);
  if (!carregada.ok) {
    return respostaErro(carregada.erro, carregada.erro.includes("encontrada") ? 404 : 500);
  }

  const sessao = carregada.sessao;
  const pacienteRes = await carregarPaciente(
    carregada.supabase,
    user.id,
    sessao.paciente_id
  );
  if (!pacienteRes.ok) {
    return respostaErro(pacienteRes.erro, 500);
  }

  const valor = valorCobrancaSessao(sessao, pacienteRes.paciente);
  if (valor <= 0) {
    return respostaErro(
      "Defina o valor da sessão ou o valor padrão do paciente antes de cobrar.",
      422
    );
  }

  const referencia = referenciaPagamentoSessao(user.id, sessao.id);
  const descricao = `Sessão ${sessao.paciente_nome || "paciente"} · ${String(sessao.data || "").slice(0, 10)}`;
  const config = extrairConfigPagamentoDeUsuario(user);

  try {
    if (config.mercadoPagoAtivo) {
      const pix = await criarPixMercadoPago({
        valor,
        descricao,
        emailPagador: user.email || "contato@psicodesk.app",
        referenciaExterna: referencia,
        idempotencyKey: referencia,
      });

      const salvo = await salvarCobrancaSessao(
        carregada.supabase,
        user.id,
        sessao.id,
        {
          status_pagamento: "pendente",
          forma_pagamento: "pix",
          pagamento_referencia: pix.paymentId,
          pagamento_pix_copia_cola: pix.copiaCola,
          pagamento_link: pix.ticketUrl,
        }
      );

      if (salvo.error) {
        return respostaErro(
          erroSalvarCobranca(salvo.error) || "Erro ao salvar cobrança.",
          erroColunaInexistente(salvo.error) ? 503 : 500
        );
      }

      return NextResponse.json({
        tipo: "mercadopago",
        valor,
        copiaCola: pix.copiaCola,
        qrCodeBase64: pix.qrCodeBase64,
        link: pix.ticketUrl,
        paymentId: pix.paymentId,
        status: pix.status,
      });
    }

    if (!config.chavePix) {
      return respostaErro(
        "Configure sua chave Pix em Minha clínica → Perfil → Editar dados.",
        422
      );
    }

    const copiaCola = gerarPixCopiaCola({
      chave: config.chavePix,
      valor,
      nomeRecebedor: config.nomeRecebedorPix,
      cidade: config.cidadeRecebedorPix,
      txid: `S${String(sessao.id).replace(/\W/g, "").slice(-20)}`,
    });

    const salvo = await salvarCobrancaSessao(
      carregada.supabase,
      user.id,
      sessao.id,
      {
        status_pagamento: "pendente",
        forma_pagamento: "pix",
        pagamento_referencia: referencia,
        pagamento_pix_copia_cola: copiaCola,
        pagamento_link: null,
      }
    );

    if (salvo.error) {
      return respostaErro(
        erroSalvarCobranca(salvo.error) || "Erro ao salvar cobrança.",
        erroColunaInexistente(salvo.error) ? 503 : 500
      );
    }

    return NextResponse.json({
      tipo: "pix_estatico",
      valor,
      copiaCola,
      qrCodeBase64: "",
      link: "",
      paymentId: "",
      status: "pending",
    });
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Não foi possível gerar a cobrança.";
    return respostaErro(mensagem, 502);
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessaoId = String(id || "").trim();
  if (!sessaoId) return respostaErro("Sessão inválida.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return respostaErro("Sessão expirada. Faça login novamente.", 401);
  }

  const carregada = await carregarSessaoDoUsuario(sessaoId, user.id);
  if (!carregada.ok) {
    return respostaErro(carregada.erro, carregada.erro.includes("encontrada") ? 404 : 500);
  }

  const sessao = carregada.sessao;
  let statusPagamento = String(sessao.status_pagamento || "pendente");
  let pagoEm = sessao.pago_em || null;

  if (
    statusPagamento !== "pago" &&
    sessao.pagamento_referencia &&
    mercadoPagoConfigurado() &&
    /^\d+$/.test(String(sessao.pagamento_referencia))
  ) {
    const mp = await consultarPagamentoMercadoPago(String(sessao.pagamento_referencia));
    if (mp && pagamentoMercadoPagoAprovado(mp.status)) {
      const agora = new Date().toISOString();
      const { error } = await carregada.supabase
        .from(TABLES.SESSOES)
        .update({
          status_pagamento: "pago",
          forma_pagamento: "pix",
          pago_em: agora,
        })
        .eq("user_id", user.id)
        .eq("id", sessao.id);

      if (!error) {
        statusPagamento = "pago";
        pagoEm = agora;
      }
    }
  }

  return NextResponse.json({
    statusPagamento,
    formaPagamento: sessao.forma_pagamento || null,
    pagoEm,
    copiaCola: sessao.pagamento_pix_copia_cola || "",
    link: sessao.pagamento_link || "",
    referencia: sessao.pagamento_referencia || "",
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessaoId = String(id || "").trim();
  if (!sessaoId) return respostaErro("Sessão inválida.");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return respostaErro("Sessão expirada. Faça login novamente.", 401);
  }

  let corpo: {
    statusPagamento?: string;
    formaPagamento?: string;
  };

  try {
    corpo = await request.json();
  } catch {
    return respostaErro("Requisição inválida.");
  }

  const status = String(corpo.statusPagamento || "").trim().toLowerCase();
  const forma = String(corpo.formaPagamento || "").trim().toLowerCase();

  if (!["pendente", "pago", "cancelado"].includes(status)) {
    return respostaErro("Status de pagamento inválido.");
  }

  const carregada = await carregarSessaoDoUsuario(sessaoId, user.id);
  if (!carregada.ok) {
    return respostaErro(carregada.erro, carregada.erro.includes("encontrada") ? 404 : 500);
  }

  const payload: Record<string, unknown> = {
    status_pagamento: status,
  };

  if (forma) payload.forma_pagamento = forma;
  if (status === "pago") {
    payload.pago_em = new Date().toISOString();
    if (!forma) payload.forma_pagamento = "pix";
  }
  if (status === "pendente") {
    payload.pago_em = null;
  }

  const { error } = await carregada.supabase
    .from(TABLES.SESSOES)
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", carregada.sessao.id);

  if (error) {
    return respostaErro("Erro ao atualizar pagamento: " + error.message, 500);
  }

  return NextResponse.json({ ok: true, statusPagamento: status });
}
