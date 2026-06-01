import type { FechamentoMes } from "./financeiro-fechamento";
import { rotuloVariacao } from "./financeiro-fechamento";
import type { ResumoFinanceiro } from "./financeiro";

const COLUNAS = 4;

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function estilizarCabecalhoTabela(row: import("exceljs").Row, colunas: number) {
  for (let c = 1; c <= colunas; c++) {
    const cell = row.getCell(c);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  }
}

function preencherLinhasResumo(
  ws: import("exceljs").Worksheet,
  linhas: ResumoFinanceiro[],
  headerRowIdx: number
) {
  const startDataRow = headerRowIdx + 1;
  let totalSessoes = 0;
  let total = 0;

  linhas.forEach((p, idx) => {
    const r = ws.getRow(startDataRow + idx);
    const presencas = Number(p.presencas || 0);
    const totalLinha = Number(p.total || 0);
    const valorSessao = presencas > 0 ? totalLinha / presencas : Number(p.valor || 0);

    r.getCell(1).value = String(p.nome || "Paciente");
    r.getCell(2).value = presencas;
    r.getCell(3).value = valorSessao;
    r.getCell(4).value = totalLinha;

    totalSessoes += presencas;
    total += totalLinha;

    const zebra = idx % 2 === 1;
    for (let c = 1; c <= COLUNAS; c++) {
      const cell = r.getCell(c);
      cell.font = { name: "Calibri", size: 11, color: { argb: "FF0F172A" } };
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right" };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      if (zebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFCFF" } };
      }
    }

    r.getCell(2).numFmt = "0";
    r.getCell(3).numFmt = '"R$" #,##0.00';
    r.getCell(4).numFmt = '"R$" #,##0.00';
  });

  const footerRowIdx = startDataRow + linhas.length + 1;
  const footer = ws.getRow(footerRowIdx);
  footer.getCell(1).value = "Total";
  footer.getCell(2).value = totalSessoes;
  footer.getCell(4).value = total;
  footer.getCell(2).numFmt = "0";
  footer.getCell(4).numFmt = '"R$" #,##0.00';
  footer.height = 20;
  for (let c = 1; c <= COLUNAS; c++) {
    const cell = footer.getCell(c);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
    cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  }

  return { totalSessoes, total };
}

export async function exportarFinanceiroXlsx(
  linhas: ResumoFinanceiro[],
  sufixoArquivo: string,
  periodoLabel: string
) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "PsicoDesk";
  wb.created = new Date();

  const ws = wb.addWorksheet("Resumo", {
    properties: { defaultRowHeight: 18 },
    views: [{ showGridLines: false }],
  });

  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const periodo = String(periodoLabel || "").trim() || "Todos os períodos";
  const col = "D";

  ws.mergeCells(`A1:${col}1`);
  ws.getCell("A1").value = "PsicoDesk — Resumo financeiro";
  ws.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF0F172A" } };
  ws.getRow(1).height = 26;

  ws.mergeCells(`A2:${col}2`);
  ws.getCell("A2").value = `Período: ${periodo}`;

  ws.mergeCells(`A3:${col}3`);
  ws.getCell("A3").value = `Gerado em: ${geradoEm}`;

  const headerRowIdx = 7;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = ["Paciente", "Sessões", "Valor por sessão", "Total"];
  headerRow.height = 20;
  estilizarCabecalhoTabela(headerRow, COLUNAS);

  const totais = preencherLinhasResumo(ws, linhas, headerRowIdx);

  const resumoRowIdx = 5;
  ws.mergeCells(`A${resumoRowIdx}:${col}${resumoRowIdx}`);
  ws.getCell(`A${resumoRowIdx}`).value = `Sessões: ${totais.totalSessoes}  •  Total: ${formatarMoeda(totais.total)}`;
  ws.getCell(`A${resumoRowIdx}`).font = { name: "Calibri", size: 11, bold: true };
  ws.getCell(`A${resumoRowIdx}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  ws.views = [{ state: "frozen", ySplit: headerRowIdx }];

  await baixarWorkbook(wb, `financeiro-${sufixoArquivo}-xlsx-v1.xlsx`);
}

export async function exportarFechamentoMesXlsx(fechamento: FechamentoMes) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  wb.creator = "PsicoDesk";
  wb.created = new Date();

  const ws = wb.addWorksheet("Fechamento", {
    properties: { defaultRowHeight: 18 },
    views: [{ showGridLines: false }],
  });

  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  const { totais, totaisAnterior, label, labelMesAnterior, linhas } = fechamento;
  const col = "D";

  ws.mergeCells(`A1:${col}1`);
  ws.getCell("A1").value = `Fechamento — ${label}`;
  ws.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF0F172A" } };
  ws.getRow(1).height = 26;

  ws.mergeCells(`A2:${col}2`);
  ws.getCell("A2").value = `Gerado em: ${geradoEm}`;

  const linhasResumo = [
    ["Total faturado", totais.total],
    ["Presenças", totais.presencas],
    ["Pacientes", totais.pacientes],
  ];

  let rowIdx = 4;
  for (const [rotulo, valor] of linhasResumo) {
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = rotulo;
    row.getCell(2).value = valor;
    row.getCell(1).font = { bold: true };
    if (typeof valor === "number" && rotulo === "Total faturado") {
      row.getCell(2).numFmt = '"R$" #,##0.00';
    }
    rowIdx += 1;
  }

  if (totaisAnterior && labelMesAnterior) {
    rowIdx += 1;
    ws.mergeCells(`A${rowIdx}:${col}${rowIdx}`);
    ws.getCell(`A${rowIdx}`).value = `Comparativo com ${labelMesAnterior}`;
    ws.getCell(`A${rowIdx}`).font = { bold: true, size: 12 };
    rowIdx += 1;

    const comparativos = [
      ["Total faturado", totais.total, totaisAnterior.total],
      ["Presenças", totais.presencas, totaisAnterior.presencas],
    ];

    for (const [rotulo, atual, anterior] of comparativos) {
      const row = ws.getRow(rowIdx);
      row.getCell(1).value = rotulo;
      row.getCell(2).value = atual;
      row.getCell(3).value = anterior;
      row.getCell(4).value = rotuloVariacao(Number(atual), Number(anterior));
      if (rotulo === "Total faturado") {
        row.getCell(2).numFmt = '"R$" #,##0.00';
        row.getCell(3).numFmt = '"R$" #,##0.00';
      }
      rowIdx += 1;
    }
  }

  rowIdx += 2;
  const headerRowIdx = rowIdx;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = ["Paciente", "Sessões", "Valor por sessão", "Total"];
  estilizarCabecalhoTabela(headerRow, COLUNAS);
  preencherLinhasResumo(ws, linhas, headerRowIdx);

  const slug = fechamento.mes.replace(/[^\d-]/g, "");
  await baixarWorkbook(wb, `fechamento-${slug}.xlsx`);
}

async function baixarWorkbook(wb: import("exceljs").Workbook, nomeArquivo: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(a.href);
}
