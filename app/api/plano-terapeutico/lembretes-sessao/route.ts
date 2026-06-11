import { NextResponse } from "next/server";

import { getPlanoTerapeuticoPorPaciente } from "../../../lib/db/plano-terapeutico";
import { valoresPacienteIdParaQuery } from "../../../lib/db/paciente-id-query";
import { TABLES } from "../../../lib/db/tables";
import { gerarLembretesSessaoPlano } from "../../../lib/plano-terapeutico-lembretes";
import { iaClinicaHabilitadaNasPreferencias } from "../../../lib/preferencias";
import { planoTerapeuticoTemConteudo } from "../../../lib/resumo-texto-clinico";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

async function pacientePertenceAoUsuario(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  pacienteId: string
) {
  const candidatos = valoresPacienteIdParaQuery(pacienteId);
  const tentativas = candidatos.length > 0 ? candidatos : [pacienteId];

  for (const id of tentativas) {
    const { data, error } = await supabase
      .from(TABLES.PACIENTES)
      .select("id, nome")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) return { ok: false as const, erro: error.message };
    if (data) return { ok: true as const, paciente: data };
  }

  return { ok: false as const, erro: "Paciente não encontrado." };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ erro: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  let corpo: {
    pacienteId?: string;
    sessaoData?: string;
    planoConteudo?: string;
    somenteBasico?: boolean;
    ultimaEvolucaoResumo?: string;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const pacienteId = String(corpo.pacienteId || "").trim();
  if (!pacienteId) {
    return NextResponse.json({ erro: "Paciente não informado." }, { status: 400 });
  }

  const pacienteOk = await pacientePertenceAoUsuario(supabase, user.id, pacienteId);
  if (!pacienteOk.ok) {
    return NextResponse.json({ erro: pacienteOk.erro }, { status: 404 });
  }

  let planoHtml = String(corpo.planoConteudo || "").trim();
  if (!planoTerapeuticoTemConteudo(planoHtml)) {
    const { data, error } = await getPlanoTerapeuticoPorPaciente(user.id, pacienteId);
    if (error) {
      return NextResponse.json(
        { erro: "Erro ao carregar plano: " + error.message },
        { status: 500 }
      );
    }
    planoHtml = String(data?.conteudo || "").trim();
  }

  if (!planoTerapeuticoTemConteudo(planoHtml)) {
    return NextResponse.json(
      { erro: "Nenhum plano terapêutico cadastrado para este paciente." },
      { status: 422 }
    );
  }

  const lembretes = await gerarLembretesSessaoPlano({
    planoHtml,
    sessaoData: corpo.sessaoData,
    ultimaEvolucaoResumo: String(corpo.ultimaEvolucaoResumo || "").trim() || undefined,
    usarIaClinica: iaClinicaHabilitadaNasPreferencias(user.user_metadata),
    somenteBasico: Boolean(corpo.somenteBasico),
  });

  return NextResponse.json(lembretes);
}
