import { NextResponse } from "next/server";

import {
  PACIENTE_DOCUMENTOS_BUCKET,
  registrarDocumentoPacienteExistente,
  removerDocumentoPorStoragePath,
} from "../../../lib/db/documentos";
import { valoresPacienteIdParaQuery } from "../../../lib/db/paciente-id-query";
import { TABLES } from "../../../lib/db/tables";
import {
  extrairTextoDePdf,
  textoPdfTemConteudoUtil,
  validarArquivoPdfPlano,
} from "../../../lib/pdf/extrair-texto-plano-pdf";
import {
  estruturarPlanoComIa,
  resumoPlanoImportado,
  sanitizarHtmlPlanoImportado,
} from "../../../lib/plano-terapeutico-importacao";
import { iaClinicaHabilitadaNasPreferencias } from "../../../lib/preferencias";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

function nomeArquivoSeguro(nome: string) {
  const partes = nome.split(".");
  const ext = partes.length > 1 ? `.${partes.pop()}` : "";
  const base = partes
    .join(".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return `${base || "plano-terapeutico"}${ext.toLowerCase()}`;
}

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
      .select("id")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) return { ok: false as const, erro: error.message };
    if (data) return { ok: true as const };
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const arquivo = formData.get("arquivo");
  const pacienteId = String(formData.get("pacienteId") || "").trim();
  const salvarAutomatico = formData.get("salvarAutomatico") === "true";

  if (!pacienteId) {
    return NextResponse.json({ erro: "Paciente não informado." }, { status: 400 });
  }

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Selecione um arquivo PDF." }, { status: 400 });
  }

  const erroValidacao = validarArquivoPdfPlano(arquivo);
  if (erroValidacao) {
    return NextResponse.json({ erro: erroValidacao }, { status: 400 });
  }

  const pacienteOk = await pacientePertenceAoUsuario(supabase, user.id, pacienteId);
  if (!pacienteOk.ok) {
    return NextResponse.json({ erro: pacienteOk.erro }, { status: 404 });
  }

  let extracao;
  try {
    const buffer = await arquivo.arrayBuffer();
    extracao = await extrairTextoDePdf(buffer);
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Não foi possível ler o PDF.";
    return NextResponse.json({ erro: mensagem }, { status: 400 });
  }

  if (!textoPdfTemConteudoUtil(extracao.texto)) {
    return NextResponse.json(
      {
        erro:
          "Não encontramos texto legível neste PDF. Pode ser um scan/imagem — nesse caso use um PDF com texto selecionável ou digite o plano manualmente.",
      },
      { status: 422 }
    );
  }

  const estruturado = await estruturarPlanoComIa(extracao.texto, {
    usarIaClinica: iaClinicaHabilitadaNasPreferencias(user.user_metadata),
  });

  const conteudo = sanitizarHtmlPlanoImportado(estruturado.html);
  if (!conteudo) {
    return NextResponse.json(
      { erro: "Não foi possível montar o plano a partir do PDF." },
      { status: 422 }
    );
  }

  const safeName = nomeArquivoSeguro(arquivo.name);
  const storagePath = `${user.id}/${pacienteId}/plano/${Date.now()}-${safeName}`;
  const agora = new Date().toISOString();

  const upload = await supabase.storage
    .from(PACIENTE_DOCUMENTOS_BUCKET)
    .upload(storagePath, arquivo, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

  if (upload.error) {
    return NextResponse.json(
      { erro: "Erro ao guardar o PDF: " + upload.error.message },
      { status: 500 }
    );
  }

  const nomeDocumento = arquivo.name.toLowerCase().endsWith(".pdf")
    ? `Plano terapêutico - ${arquivo.name}`
    : `Plano terapêutico - ${arquivo.name}.pdf`;

  const documentoRegistrado = await registrarDocumentoPacienteExistente(supabase, {
    userId: user.id,
    pacienteId,
    nomeArquivo: nomeDocumento,
    storagePath,
    tipoMime: "application/pdf",
    tamanhoBytes: arquivo.size,
  });

  if (documentoRegistrado.error) {
    await supabase.storage.from(PACIENTE_DOCUMENTOS_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { erro: documentoRegistrado.error.message },
      { status: 500 }
    );
  }

  const planoExistente = await supabase
    .from(TABLES.PACIENTE_PLANO_TERAPEUTICO)
    .select("*")
    .eq("user_id", user.id)
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (planoExistente.error) {
    await supabase.storage.from(PACIENTE_DOCUMENTOS_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { erro: "Erro ao carregar plano atual: " + planoExistente.error.message },
      { status: 500 }
    );
  }

  const caminhoAnterior = planoExistente.data?.pdf_storage_path || null;

  if (salvarAutomatico) {
    const payload = {
      conteudo,
      updated_at: agora,
      pdf_storage_path: storagePath,
      pdf_nome_arquivo: arquivo.name,
      pdf_importado_em: agora,
    };

    const salvo = planoExistente.data
      ? await supabase
          .from(TABLES.PACIENTE_PLANO_TERAPEUTICO)
          .update(payload)
          .eq("user_id", user.id)
          .eq("paciente_id", pacienteId)
          .select("*")
          .single()
      : await supabase
          .from(TABLES.PACIENTE_PLANO_TERAPEUTICO)
          .insert([
            {
              user_id: user.id,
              paciente_id: pacienteId,
              ...payload,
            },
          ])
          .select("*")
          .single();

    if (salvo.error) {
      await supabase.storage.from(PACIENTE_DOCUMENTOS_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { erro: "Erro ao salvar plano: " + salvo.error.message },
        { status: 500 }
      );
    }

    if (caminhoAnterior && caminhoAnterior !== storagePath) {
      await supabase.storage
        .from(PACIENTE_DOCUMENTOS_BUCKET)
        .remove([caminhoAnterior]);
      await removerDocumentoPorStoragePath(supabase, user.id, caminhoAnterior);
    }
  }

  return NextResponse.json({
    conteudo,
    resumo: resumoPlanoImportado(conteudo),
    totalPaginas: extracao.totalPaginas,
    usouIa: estruturado.usouIa,
    avisoIa: estruturado.avisoIa,
    pdfNomeArquivo: arquivo.name,
    pdfStoragePath: storagePath,
    salvo: salvarAutomatico,
  });
}
