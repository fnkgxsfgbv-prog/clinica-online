import { getAnamnesePorPaciente } from "./db/anamnese";
import {
  buscarBlobDocumento,
  criarUrlDocumento,
  criarUrlDownloadDocumento,
  documentoEhImagem,
  documentoEhPdf,
} from "./db/documentos";
import { listPacienteFormularios, normalizarCamposModelo } from "./db/modelos";
import { formatarDataPaciente } from "./datas-paciente";
import {
  nomeArquivoFormulario,
  parsearTextoFormulario,
} from "./formulario-export";
import type {
  AnamneseCampo,
  PacienteAnamnese,
  PacienteDocumento,
  PacienteFormulario,
} from "../types";

const CAMPOS_LEGADOS: { id: string; titulo: string }[] = [
  ["queixa_principal", "Queixa principal"],
  ["motivo_consulta", "Motivo da consulta"],
  ["historia_atual", "História atual"],
  ["historico_psicologico", "Histórico psicológico"],
  ["historico_psiquiatrico", "Histórico psiquiátrico"],
  ["historico_medico", "Histórico médico"],
  ["medicamentos", "Medicamentos"],
  ["alergias", "Alergias"],
  ["historico_familiar", "Histórico familiar"],
  ["desenvolvimento_infancia", "Desenvolvimento e infância"],
  ["sono", "Sono"],
  ["alimentacao", "Alimentação"],
  ["rotina", "Rotina"],
  ["trabalho_estudos", "Trabalho / estudos"],
  ["relacionamentos", "Relacionamentos"],
  ["uso_substancias", "Uso de substâncias"],
  ["risco", "Risco / segurança"],
  ["objetivos_terapia", "Objetivos terapêuticos"],
  ["observacoes", "Observações gerais"],
].map(([id, titulo]) => ({ id, titulo }));

function extrairCamposFormulario(
  registro: PacienteFormulario | PacienteAnamnese
): AnamneseCampo[] {
  if (Array.isArray(registro.campos) && registro.campos.length > 0) {
    return normalizarCamposModelo(registro.campos);
  }

  const bruto = registro as PacienteAnamnese;
  return CAMPOS_LEGADOS.map((campo) => ({
    id: campo.id,
    titulo: campo.titulo,
    placeholder: "",
    resposta: String(bruto[campo.id as keyof PacienteAnamnese] ?? "").trim(),
  })).filter((campo) => campo.resposta.length > 0);
}

export type CampoVisualizacao = { titulo: string; resposta: string };

export type VisualizacaoDocumento =
  | {
      tipo: "formulario";
      titulo: string;
      meta: string[];
      campos: CampoVisualizacao[];
    }
  | {
      tipo: "pdf" | "imagem";
      titulo: string;
      url: string;
      urlDownload?: string;
      revogarUrl?: () => void;
    };

function normalizarNomeArquivo(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function nomesArquivoPossiveis(nomeFormulario: string) {
  const base = nomeFormulario || "Formulario";
  const candidatos = new Set<string>();

  for (const ext of ["pdf", "txt", ""]) {
    const nome = ext ? nomeArquivoFormulario(base, ext) : base;
    candidatos.add(nome.toLowerCase());
    candidatos.add(normalizarNomeArquivo(nome));
  }

  candidatos.add(`${base}.txt`.toLowerCase());
  candidatos.add(normalizarNomeArquivo(base));

  return candidatos;
}

function documentoCombinaNomeFormulario(
  documento: PacienteDocumento,
  nomeFormulario: string
) {
  const arquivo = documento.nome_arquivo.toLowerCase();
  const storage = documento.storage_path.toLowerCase();
  const chaves = nomesArquivoPossiveis(nomeFormulario);

  for (const chave of chaves) {
    if (!chave) continue;
    if (arquivo === chave || storage.includes(chave)) return true;
    if (arquivo.includes(chave) || storage.includes(chave)) return true;
  }

  const slugForm = normalizarNomeArquivo(nomeFormulario);
  const slugArquivo = normalizarNomeArquivo(
    documento.nome_arquivo.replace(/\.(pdf|txt)$/i, "")
  );

  return slugForm.length > 3 && slugArquivo.includes(slugForm);
}

function documentoPareceAnamnese(documento: PacienteDocumento) {
  const texto = `${documento.nome_arquivo} ${documento.storage_path}`.toLowerCase();
  return /anamnese|formulario|formulário/.test(texto);
}

function documentoEhTexto(documento: PacienteDocumento) {
  const mime = (documento.tipo_mime || "").toLowerCase();
  const nome = (documento.nome_arquivo || "").toLowerCase();
  return mime.startsWith("text/") || nome.endsWith(".txt");
}

function metaDoPaciente({
  pacienteNome,
  pacienteDataNascimento,
  atualizadoEm,
}: {
  pacienteNome?: string;
  pacienteDataNascimento?: string | null;
  atualizadoEm?: string | null;
}) {
  const meta: string[] = [];
  if (pacienteNome?.trim()) meta.push(`Paciente: ${pacienteNome.trim()}`);
  if (pacienteDataNascimento) {
    meta.push(
      `Data de nascimento: ${formatarDataPaciente(pacienteDataNascimento)}`
    );
  }
  if (atualizadoEm) {
    const data = new Date(atualizadoEm);
    if (!Number.isNaN(data.getTime())) {
      meta.push(
        `Atualizado em: ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(data)}`
      );
    }
  }
  return meta;
}

async function prepararArquivoNativo(documento: PacienteDocumento) {
  const [blobRes, downloadRes, urlRes] = await Promise.all([
    buscarBlobDocumento(documento),
    criarUrlDownloadDocumento(documento),
    criarUrlDocumento(documento),
  ]);

  const tipo = documentoEhPdf(documento) ? ("pdf" as const) : ("imagem" as const);

  if (!blobRes.error && blobRes.data) {
    const url = URL.createObjectURL(blobRes.data);
    return {
      data: {
        tipo,
        titulo: documento.nome_arquivo,
        url,
        urlDownload: downloadRes.data?.signedUrl,
        revogarUrl: () => URL.revokeObjectURL(url),
      },
      error: null,
    };
  }

  if (urlRes.error || !urlRes.data?.signedUrl) {
    return {
      data: null,
      error:
        blobRes.error ||
        urlRes.error ||
        new Error("Não foi possível abrir o arquivo"),
    };
  }

  return {
    data: {
      tipo,
      titulo: documento.nome_arquivo,
      url: urlRes.data.signedUrl,
      urlDownload: downloadRes.data?.signedUrl,
    },
    error: null,
  };
}

async function buscarFormularioNoBanco(
  userId: string,
  pacienteId: string | number,
  documento: PacienteDocumento
) {
  const { data: formularios, error } = await listPacienteFormularios(
    userId,
    pacienteId
  );
  if (error) return { data: null, error };

  const lista = formularios || [];
  const porNome = lista.find((item) =>
    documentoCombinaNomeFormulario(
      documento,
      item.nome_formulario || "Formulário"
    )
  );
  if (porNome) return { data: porNome, error: null };

  if (lista.length === 1 && documentoPareceAnamnese(documento)) {
    return { data: lista[0], error: null };
  }

  const { data: anamnese, error: erroAnamnese } = await getAnamnesePorPaciente(
    userId,
    pacienteId
  );
  if (erroAnamnese) return { data: null, error: erroAnamnese };

  if (
    anamnese &&
    documentoCombinaNomeFormulario(
      documento,
      anamnese.nome_formulario || "Anamnese do paciente"
    )
  ) {
    return { data: anamnese, error: null };
  }

  if (anamnese && documentoPareceAnamnese(documento)) {
    return { data: anamnese, error: null };
  }

  return { data: null, error: null };
}

export async function prepararVisualizacaoDocumento({
  userId,
  pacienteId,
  documento,
  pacienteNome,
  pacienteDataNascimento,
}: {
  userId: string;
  pacienteId: string | number;
  documento: PacienteDocumento;
  pacienteNome?: string;
  pacienteDataNascimento?: string | null;
}): Promise<{ data: VisualizacaoDocumento | null; error: Error | null }> {
  if (documentoEhPdf(documento) || documentoEhImagem(documento)) {
    return prepararArquivoNativo(documento);
  }

  if (documentoPareceAnamnese(documento) || documentoEhTexto(documento)) {
    const formularioRes = await buscarFormularioNoBanco(
      userId,
      pacienteId,
      documento
    );
    if (formularioRes.error) {
      return { data: null, error: formularioRes.error };
    }

    if (formularioRes.data) {
      const registro = formularioRes.data;
      const campos = extrairCamposFormulario(registro);
      const titulo = registro.nome_formulario || "Formulário";

      return {
        data: {
          tipo: "formulario",
          titulo,
          meta: metaDoPaciente({
            pacienteNome,
            pacienteDataNascimento,
            atualizadoEm: registro.updated_at,
          }),
          campos: campos.map((campo) => ({
            titulo: campo.titulo,
            resposta: campo.resposta?.trim() || "(sem resposta)",
          })),
        },
        error: null,
      };
    }
  }

  const blobRes = await buscarBlobDocumento(documento);
  if (blobRes.error || !blobRes.data) {
    return {
      data: null,
      error: blobRes.error || new Error("Não foi possível ler o documento"),
    };
  }

  const mime = (documento.tipo_mime || blobRes.data.type || "").toLowerCase();
  if (mime.includes("pdf")) {
    const url = URL.createObjectURL(blobRes.data);
    return {
      data: {
        tipo: "pdf",
        titulo: documento.nome_arquivo,
        url,
        revogarUrl: () => URL.revokeObjectURL(url),
      },
      error: null,
    };
  }

  if (mime.startsWith("image/")) {
    const url = URL.createObjectURL(blobRes.data);
    return {
      data: {
        tipo: "imagem",
        titulo: documento.nome_arquivo,
        url,
        revogarUrl: () => URL.revokeObjectURL(url),
      },
      error: null,
    };
  }

  const texto = await blobRes.data.text();
  const parsed = parsearTextoFormulario(texto);

  return {
    data: {
      tipo: "formulario",
      titulo: parsed.titulo,
      meta:
        parsed.meta.length > 0
          ? parsed.meta
          : metaDoPaciente({ pacienteNome, pacienteDataNascimento }),
      campos: parsed.campos,
    },
    error: null,
  };
}
