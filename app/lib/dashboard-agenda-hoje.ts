import { criarDataHoraSessao } from "./agenda-sessao";
import { visualFrequenciaAgenda } from "./status";
import type { Sessao } from "../types";

export function ordenarSessoesPorHorario(sessoes: Sessao[]) {
  return [...sessoes].sort((a, b) => {
    const ta = criarDataHoraSessao(a.data, a.hora || "08:00")?.getTime() ?? 0;
    const tb = criarDataHoraSessao(b.data, b.hora || "08:00")?.getTime() ?? 0;
    return ta - tb || String(a.id).localeCompare(String(b.id));
  });
}

export function resumoDia(sessoes: Sessao[]) {
  let presentes = 0;
  let faltas = 0;
  let agendadas = 0;

  for (const sessao of sessoes) {
    const freq = visualFrequenciaAgenda(sessao.status);
    if (freq.classe === "is-present") presentes += 1;
    else if (freq.classe === "is-absent") faltas += 1;
    else if (freq.classe === "is-cancel") continue;
    else agendadas += 1;
  }

  return { presentes, faltas, agendadas };
}

export function sessaoAindaPendente(sessao: Sessao) {
  return visualFrequenciaAgenda(sessao.status).classe === "is-pending";
}

export function proximaSessaoHojeId(
  sessoes: Sessao[],
  horaAtual = new Date().toTimeString().slice(0, 5)
) {
  const ordenadas = ordenarSessoesPorHorario(sessoes);
  const pendentes = ordenadas.filter(sessaoAindaPendente);
  if (pendentes.length === 0) return null;

  const minutosAtuais = minutosDesdeMeiaNoite(horaAtual);
  const futura = pendentes.find(
    (sessao) => minutosDesdeMeiaNoite(sessao.hora) >= minutosAtuais
  );

  return futura?.id ?? pendentes[pendentes.length - 1]?.id ?? null;
}

export function rotuloResumoDia(
  resumo: ReturnType<typeof resumoDia>,
  total: number
) {
  const chips: Array<{ key: string; label: string; className?: string }> = [
    {
      key: "total",
      label: `${total} ${total === 1 ? "sessão" : "sessões"}`,
    },
  ];

  if (total > 0 && resumo.presentes === total) {
    chips.push({
      key: "done",
      label: "Dia concluído",
      className: "is-present",
    });
    return chips;
  }

  if (resumo.presentes > 0) {
    chips.push({
      key: "presentes",
      label: `${resumo.presentes} ${resumo.presentes === 1 ? "presente" : "presentes"}`,
      className: "is-present",
    });
  }

  if (resumo.agendadas > 0) {
    chips.push({
      key: "agendadas",
      label: `${resumo.agendadas} ${resumo.agendadas === 1 ? "agendada" : "agendadas"}`,
      className: "is-pending",
    });
  }

  if (resumo.faltas > 0) {
    chips.push({
      key: "faltas",
      label: `${resumo.faltas} ${resumo.faltas === 1 ? "falta" : "faltas"}`,
      className: "is-absent",
    });
  }

  return chips;
}

function minutosDesdeMeiaNoite(hora?: string | null) {
  const partes = String(hora || "08:00").trim().split(":");
  const h = Number(partes[0]);
  const m = Number(partes[1]);
  if (!Number.isFinite(h)) return 8 * 60;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}
