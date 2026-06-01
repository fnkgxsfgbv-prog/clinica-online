import { dataReferenciaISO, filtrarPorMesReferencia } from "./financeiro";
import {
  deduplicarFrequenciasPorSessao,
  indicePacientes,
  resolverPaciente,
} from "./frequencia-utils";
import { parseValorBr } from "./moeda";
import { isStatusPresente } from "./status";
import type { Frequencia, Paciente, Sessao } from "../types";

export type AlertaFinanceiro = {
  id: string;
  tipo: "sem_vinculo" | "sem_valor";
  titulo: string;
  detalhe: string;
  href?: string;
};

function valorPresenca(paciente: Paciente | undefined, sessao?: Sessao): number {
  const valorSessao = parseValorBr(sessao?.valor);
  if (valorSessao > 0) return valorSessao;
  if (!paciente) return 0;
  return parseValorBr(paciente.valor_sessao ?? paciente.valor);
}

/**
 * Alertas de integração agenda ↔ financeiro no período (mês ou dados completos).
 */
export function diagnosticarIntegracaoFinanceiro(
  pacientes: Paciente[],
  frequencias: Frequencia[],
  sessoes: Sessao[],
  mesAAAAmm?: string
): AlertaFinanceiro[] {
  const { porId, porNome } = indicePacientes(pacientes);
  const freqBase = mesAAAAmm?.trim()
    ? filtrarPorMesReferencia(frequencias, mesAAAAmm)
    : frequencias;
  const sessBase = mesAAAAmm?.trim()
    ? filtrarPorMesReferencia(sessoes, mesAAAAmm)
    : sessoes;

  const alertas: AlertaFinanceiro[] = [];
  const vistos = new Set<string>();

  function add(alerta: Omit<AlertaFinanceiro, "id">) {
    const chave = `${alerta.tipo}:${alerta.titulo}:${alerta.detalhe}`;
    if (vistos.has(chave)) return;
    vistos.add(chave);
    alertas.push({ ...alerta, id: chave });
  }

  for (const f of deduplicarFrequenciasPorSessao(freqBase)) {
    if (!isStatusPresente(f.status)) continue;

    const paciente = resolverPaciente(
      porId,
      porNome,
      f.paciente_id,
      f.paciente_nome
    );
    const nome = paciente?.nome || f.paciente_nome || "Paciente";
    const dataIso = dataReferenciaISO(f.data);
    const dataLabel = dataIso
      ? dataIso.split("-").reverse().join("/")
      : "data não informada";

    const sessao =
      f.sessao_id != null
        ? sessBase.find((s) => String(s.id) === String(f.sessao_id))
        : sessBase.find(
            (s) =>
              dataReferenciaISO(s.data) === dataIso &&
              (paciente
                ? String(s.paciente_id) === String(paciente.id)
                : String(s.paciente_nome || "").trim() ===
                  String(f.paciente_nome || "").trim())
          );

    if (!f.sessao_id && !sessao) {
      add({
        tipo: "sem_vinculo",
        titulo: `${nome} — ${dataLabel}`,
        detalhe:
          "Presença na frequência sem sessão vinculada na agenda. Abra a agenda e confira o dia.",
        href: dataIso ? `/agenda` : undefined,
      });
      continue;
    }

    if (f.sessao_id && !sessao) {
      add({
        tipo: "sem_vinculo",
        titulo: `${nome} — ${dataLabel}`,
        detalhe:
          "Frequência aponta para uma sessão que não foi encontrada. Atualize a agenda ou a frequência.",
        href: `/sessao/${f.sessao_id}`,
      });
      continue;
    }

    const valor = valorPresenca(paciente, sessao);
    if (valor <= 0) {
      add({
        tipo: "sem_valor",
        titulo: `${nome} — ${dataLabel}`,
        detalhe: paciente
          ? "Sem valor na sessão nem no cadastro do paciente. Defina o valor por sessão."
          : "Presença sem paciente vinculado e sem valor na sessão.",
        href: paciente ? `/paciente/${paciente.id}/editar` : sessao ? `/sessao/${sessao.id}` : undefined,
      });
    }

  }

  const ordem: Record<AlertaFinanceiro["tipo"], number> = {
    sem_vinculo: 0,
    sem_valor: 1,
  };

  return alertas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
}
