import jsPDF from "jspdf";
import type { AnamneseCampo } from "../../types";
import { formatarDataPaciente } from "../datas-paciente";
import type { FormularioExportMeta } from "../formulario-export";

const MARGEM = 16;
const LARGURA_LINHA = 180 - MARGEM * 2;
const LH = 5.2;

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

function tituloSecao(doc: jsPDF, c: Cursor, texto: string) {
  c.y += 3;
  garantirEspaco(doc, c, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  doc.text(texto, MARGEM, c.y);
  c.y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
}

export function gerarFormularioPdfBlob({
  campos,
  nomeFormulario,
  pacienteNome,
  pacienteDataNascimento,
}: FormularioExportMeta & { campos: AnamneseCampo[] }): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const c: Cursor = { y: MARGEM };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(13, 61, 36);
  doc.text(nomeFormulario || "Formulário", MARGEM, c.y);
  c.y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  if (pacienteNome?.trim()) {
    bloco(doc, c, `Paciente: ${pacienteNome.trim()}`);
  }
  if (pacienteDataNascimento) {
    bloco(
      doc,
      c,
      `Data de nascimento: ${formatarDataPaciente(pacienteDataNascimento)}`
    );
  }
  bloco(
    doc,
    c,
    `Gerado em: ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())}`
  );

  c.y += 4;
  doc.setDrawColor(226, 235, 229);
  doc.line(MARGEM, c.y, 210 - MARGEM, c.y);
  c.y += 8;

  for (const campo of campos) {
    tituloSecao(doc, c, campo.titulo || "Campo sem título");
    bloco(doc, c, campo.resposta?.trim() || "(sem resposta)");
    c.y += 2;
  }

  return doc.output("blob");
}
