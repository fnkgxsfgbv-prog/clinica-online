import jsPDF from "jspdf";
import { formatarDataPaciente } from "../datas-paciente";
import {
  type DadosClinica,
  dadosClinicaPadrao,
  rotuloRodapeClinica,
} from "../dados-clinica";
import { ordenarCronologico } from "../ordenar-datas";
import type { Evolucao, Paciente, Sessao } from "../../types";

const MARGEM = 16;
const LARGURA_LINHA = 180 - MARGEM * 2;
const LH = 5.2;

function slugArquivo(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "paciente"
  );
}

type Cursor = { y: number };

function garantirEspaco(doc: jsPDF, c: Cursor, altura: number, limite = 278) {
  if (c.y + altura > limite) {
    doc.addPage();
    c.y = MARGEM;
  }
}

function bloco(
  doc: jsPDF,
  c: Cursor,
  texto: string,
  opts?: { negrito?: boolean; tamanho?: number }
) {
  const tamanho = opts?.tamanho ?? 10;
  doc.setFontSize(tamanho);
  if (opts?.negrito) doc.setFont("helvetica", "bold");
  else doc.setFont("helvetica", "normal");

  const linhas = doc.splitTextToSize(texto.trim() || "—", LARGURA_LINHA);
  for (const linha of linhas) {
    garantirEspaco(doc, c, LH + 1);
    doc.text(linha, MARGEM, c.y);
    c.y += LH;
  }
}

function titulo(doc: jsPDF, c: Cursor, texto: string) {
  c.y += 4;
  garantirEspaco(doc, c, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(texto, MARGEM, c.y);
  c.y += 10;
  doc.setFont("helvetica", "normal");
}

function rotuloValor(
  doc: jsPDF,
  c: Cursor,
  rotulo: string,
  valor?: string | number | null
) {
  const v =
    valor != null && String(valor).trim() !== ""
      ? String(valor).trim()
      : "—";
  bloco(doc, c, `${rotulo}: ${v}`, { negrito: false, tamanho: 10 });
}

function ordenarEvolucoes(lista: Evolucao[]): Evolucao[] {
  return ordenarCronologico(lista, (e) => ({ data: e.data }), "asc");
}

function ordenarSessoes(lista: Sessao[]): Sessao[] {
  return ordenarCronologico(lista, (s) => ({ data: s.data, hora: s.hora }), "asc");
}

/**
 * Gera PDF do prontuário (identificação, sessões resumidas e evoluções clínicas).
 */
export function exportarProntuarioPacientePdf(
  paciente: Paciente,
  evolucoes: Evolucao[],
  sessoes: Sessao[],
  clinica: DadosClinica = dadosClinicaPadrao()
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const c: Cursor = { y: MARGEM };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const cabecalho = rotuloRodapeClinica(clinica);
  if (cabecalho) {
    doc.text(cabecalho, MARGEM, c.y);
    c.y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Prontuário", MARGEM, c.y);
  c.y += 12;

  doc.setFontSize(14);
  doc.text(paciente.nome || "Paciente", MARGEM, c.y);
  c.y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  titulo(doc, c, "Identificação");
  rotuloValor(
    doc,
    c,
    "Data de nascimento",
    formatarDataPaciente(paciente.data_nascimento)
  );
  rotuloValor(doc, c, "Telefone", paciente.telefone);
  rotuloValor(doc, c, "Convênio", paciente.convenio);
  rotuloValor(doc, c, "CID", paciente.cid);
  rotuloValor(doc, c, "Status", paciente.status);
  rotuloValor(doc, c, "Responsável", paciente.responsavel);
  rotuloValor(doc, c, "Diagnóstico", paciente.diagnostico);
  rotuloValor(doc, c, "Valor da sessão", paciente.valor_sessao);
  if (paciente.observacoes?.trim()) {
    c.y += 2;
    bloco(doc, c, "Observações cadastrais:", { negrito: true, tamanho: 10 });
    bloco(doc, c, paciente.observacoes);
  }

  titulo(doc, c, "Sessões (resumo)");
  const sOrd = ordenarSessoes(sessoes);
  if (sOrd.length === 0) {
    bloco(doc, c, "Nenhuma sessão registrada.");
  } else {
    for (const s of sOrd) {
      c.y += 1;
      garantirEspaco(doc, c, LH * 2);
      bloco(
        doc,
        c,
        `• ${formatarDataPaciente(s.data)} ${s.hora ? `às ${s.hora}` : ""} — Status: ${s.status || "Agendada"}`
      );
    }
  }

  titulo(doc, c, "Evoluções");
  const eOrd = ordenarEvolucoes(evolucoes);
  if (eOrd.length === 0) {
    bloco(doc, c, "Nenhuma evolução registrada.");
  } else {
    for (const e of eOrd) {
      c.y += 3;
      titulo(doc, c, `Evolução — ${formatarDataPaciente(e.data)}`);
      if (e.humor?.trim()) rotuloValor(doc, c, "Humor", e.humor);
      if (e.status_sessao?.trim()) {
        rotuloValor(doc, c, "Status da sessão", e.status_sessao);
      }
      if (e.queixa?.trim()) {
        bloco(doc, c, "Queixa:", { negrito: true });
        bloco(doc, c, e.queixa);
      }
      if (e.objetivo?.trim()) {
        bloco(doc, c, "Objetivo:", { negrito: true });
        bloco(doc, c, e.objetivo);
      }
      if (e.intervencao?.trim()) {
        bloco(doc, c, "Intervenção:", { negrito: true });
        bloco(doc, c, e.intervencao);
      }
      if (e.observacoes?.trim()) {
        bloco(doc, c, "Observações:", { negrito: true });
        bloco(doc, c, e.observacoes);
      }
      if (e.plano?.trim()) {
        bloco(doc, c, "Plano:", { negrito: true });
        bloco(doc, c, e.plano);
      }
      if (e.encaminhamentos?.trim()) {
        bloco(doc, c, "Encaminhamentos:", { negrito: true });
        bloco(doc, c, e.encaminhamentos);
      }
    }
  }

  c.y += 8;
  garantirEspaco(doc, c, 20);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const gerado = new Date().toLocaleString("pt-BR");
  bloco(doc, c, `Documento gerado eletronicamente em ${gerado}.`, { tamanho: 8 });
  doc.setTextColor(0, 0, 0);

  const id = String(paciente.id ?? "id");
  const nomeArquivo = `prontuario-${slugArquivo(paciente.nome || "paciente")}-${id}.pdf`;
  doc.save(nomeArquivo);
}
