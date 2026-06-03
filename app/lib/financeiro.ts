import type { Frequencia, Paciente, Sessao } from "../types";
import {
  chaveMes,
  chavePacienteData,
  deduplicarFrequenciasPorSessao,
  indicePacientes,
  resolverPaciente,
} from "./frequencia-utils";
import { parseValorBr } from "./moeda";
import { isStatusFaltou, isStatusPresente } from "./status";

export type ResumoFinanceiro = {
  id: string | number;
  nome: string;
  presencas: number;
  /** Valor médio por presença no período (útil quando há sessões com valores diferentes). */
  valor: number;
  total: number;
};

/** Filtra frequências ou sessões pela chave `AAAA-MM` da data (vazio = sem filtro). */
export function filtrarPorMesReferencia<
  T extends { data?: string | null },
>(itens: T[], mesAAAAmm: string): T[] {
  if (!mesAAAAmm) return itens;
  return itens.filter((x) => chaveMes(x.data) === mesAAAAmm);
}

/**
 * Normaliza `data` para `AAAA-MM-DD` (comparação lexicográfica = cronológica em ISO).
 */
export function dataReferenciaISO(data?: string | null): string | null {
  if (data == null) return null;
  const texto = String(data).trim();
  const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

/** Filtra por intervalo inclusivo em `AAAA-MM-DD`. Se início > fim, troca automaticamente. */
export function filtrarPorIntervaloDatas<
  T extends { data?: string | null },
>(itens: T[], inicio: string, fim: string): T[] {
  const i0 = inicio?.trim();
  const i1 = fim?.trim();
  if (!i0 || !i1) return itens;

  let a = i0;
  let b = i1;
  if (a > b) [a, b] = [b, a];

  return itens.filter((x) => {
    const iso = dataReferenciaISO(x.data);
    if (!iso) return false;
    return iso >= a && iso <= b;
  });
}

function formatIsoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Segunda-feira (ISO) da semana que contém a data informada. */
export function inicioSemanaISO(data?: string | null): string | null {
  const iso = dataReferenciaISO(data);
  if (!iso) return null;

  const [ano, mes, dia] = iso.split("-").map(Number);
  const dataLocal = new Date(ano, mes - 1, dia);
  const diaSemana = dataLocal.getDay();
  const offset = diaSemana === 0 ? -6 : 1 - diaSemana;
  dataLocal.setDate(dataLocal.getDate() + offset);

  return formatIsoLocal(dataLocal);
}

/** Domingo da semana cujo início (segunda) é `inicioSemana`. */
export function fimSemanaISO(inicioSemana: string): string {
  const [ano, mes, dia] = inicioSemana.split("-").map(Number);
  const dataLocal = new Date(ano, mes - 1, dia);
  dataLocal.setDate(dataLocal.getDate() + 6);
  return formatIsoLocal(dataLocal);
}

/** Filtra itens pela semana (segunda a domingo) identificada pelo início em `AAAA-MM-DD`. */
export function filtrarPorSemanaReferencia<
  T extends { data?: string | null },
>(itens: T[], inicioSemana: string): T[] {
  const inicio = inicioSemana.trim();
  if (!inicio) return itens;
  return filtrarPorIntervaloDatas(itens, inicio, fimSemanaISO(inicio));
}

/** Semana (segunda a domingo) cruza o mês `AAAA-MM` se a segunda ou o domingo pertencerem a ele. */
export function semanaIntersectsMes(
  inicioSemana: string,
  mesAAAAmm: string
): boolean {
  const mes = mesAAAAmm.trim();
  if (!mes) return true;
  return (
    chaveMes(inicioSemana) === mes || chaveMes(fimSemanaISO(inicioSemana)) === mes
  );
}

/** Rótulo curto para exibição: `19–25/05/2026` (cabe em uma linha nos cards). */
export function labelSemana(
  inicioSemana: string,
  opts?: { curto?: boolean }
): string {
  const fim = fimSemanaISO(inicioSemana);
  const [, mesInicio, diaInicio] = inicioSemana.split("-");
  const [, mesFim, diaFim] = fim.split("-");
  const ano = inicioSemana.slice(0, 4);
  const dia = (v: string) => String(Number(v));

  if (opts?.curto) {
    if (mesInicio === mesFim) {
      return `${dia(diaInicio)}–${dia(diaFim)}/${mesInicio}`;
    }
    return `${dia(diaInicio)}/${mesInicio}–${dia(diaFim)}/${mesFim}`;
  }

  if (mesInicio === mesFim) {
    return `${diaInicio}–${diaFim}/${mesInicio}/${ano}`;
  }
  return `${diaInicio}/${mesInicio}–${diaFim}/${mesFim}/${ano}`;
}

/** Semana anterior àquela cujo início é `inicioSemana` (segunda-feira). */
export function semanaAnterior(inicioSemana: string): string {
  const [ano, mes, dia] = inicioSemana.split("-").map(Number);
  const dataLocal = new Date(ano, mes - 1, dia);
  dataLocal.setDate(dataLocal.getDate() - 7);
  return formatIsoLocal(dataLocal);
}

export type ResumoSemanalFinanceiro = {
  inicio: string;
  label: string;
  total: number;
  presencas: number;
  pacientes: number;
};

/** Totais faturados por semana com presença, da mais recente para a mais antiga. */
export function calcularResumosSemanais(
  pacientes: Paciente[],
  frequencias: Frequencia[],
  sessoes: Sessao[],
  semanas: string[]
): ResumoSemanalFinanceiro[] {
  return semanas.map((inicio) => {
    const frequenciasSemana = filtrarPorSemanaReferencia(frequencias, inicio);
    const sessoesSemana = filtrarPorSemanaReferencia(sessoes, inicio);
    const dados = calcularResumoFinanceiro(
      pacientes,
      frequenciasSemana,
      sessoesSemana
    );

    return {
      inicio,
      label: labelSemana(inicio),
      total: dados.reduce((acc, item) => acc + item.total, 0),
      presencas: dados.reduce((acc, item) => acc + item.presencas, 0),
      pacientes: dados.length,
    };
  });
}

function valorSessaoPaciente(paciente?: Paciente) {
  if (!paciente) return 0;
  return parseValorBr(paciente.valor_sessao ?? paciente.valor);
}

function valorPresenca(paciente: Paciente | undefined, sessao?: Sessao) {
  const valorSessao = parseValorBr(sessao?.valor);
  if (valorSessao > 0) return valorSessao;
  return valorSessaoPaciente(paciente);
}

function chavePaciente(paciente: Paciente) {
  return String(paciente.id);
}

function resolverPacienteFrequencia(
  porId: Map<string, Paciente>,
  porNome: Map<string, Paciente>,
  frequencia: Frequencia,
  sessoes: Sessao[]
) {
  const porNomeDireto = resolverPaciente(
    porId,
    porNome,
    null,
    frequencia.paciente_nome
  );
  if (porNomeDireto) return porNomeDireto;

  const porIdDireto = resolverPaciente(
    porId,
    porNome,
    frequencia.paciente_id,
    frequencia.paciente_nome
  );
  if (porIdDireto) return porIdDireto;

  if (frequencia.sessao_id != null) {
    const sessao = sessoes.find(
      (s) => String(s.id) === String(frequencia.sessao_id)
    );
    if (sessao) {
      return resolverPaciente(
        porId,
        porNome,
        sessao.paciente_id,
        sessao.paciente_nome
      );
    }
  }

  return undefined;
}

type ItemResumo = {
  id: string | number;
  nome: string;
  presencas: number;
  total: number;
  paciente?: Paciente;
};

export function calcularResumoFinanceiro(
  pacientes: Paciente[],
  frequencias: Frequencia[],
  sessoes: Sessao[] = []
): ResumoFinanceiro[] {
  const { porId, porNome } = indicePacientes(pacientes);
  const frequenciasUnicas = deduplicarFrequenciasPorSessao(frequencias);

  const resumos = new Map<string, ItemResumo>();
  const sessoesContadas = new Set<string>();
  const sessoesComFrequencia = new Set<string>();
  const faltasPorPacienteData = new Set<string>();

  for (const f of frequenciasUnicas) {
    if (f.sessao_id != null && f.sessao_id !== "") {
      sessoesComFrequencia.add(String(f.sessao_id));
    }
    if (!isStatusFaltou(f.status)) continue;

    const pacienteFalta = resolverPaciente(
      porId,
      porNome,
      f.paciente_id,
      f.paciente_nome
    );
    const chaveFalta = chavePacienteData(
      pacienteFalta?.id ?? f.paciente_id,
      pacienteFalta?.nome ?? f.paciente_nome,
      f.data
    );
    if (chaveFalta) faltasPorPacienteData.add(chaveFalta);
  }

  function obterResumo(chave: string, nome: string, paciente?: Paciente) {
    let item = resumos.get(chave);
    if (!item) {
      item = {
        id: paciente?.id ?? chave,
        nome: paciente?.nome ?? nome,
        presencas: 0,
        total: 0,
        paciente,
      };
      resumos.set(chave, item);
    } else if (paciente && !item.paciente) {
      item.paciente = paciente;
      item.id = paciente.id;
      item.nome = paciente.nome;
    }
    return item;
  }

  function acumularValor(resumo: ItemResumo, valorLinha: number) {
    resumo.total += valorLinha;
  }

  for (const frequencia of frequenciasUnicas) {
    if (!isStatusPresente(frequencia.status)) continue;

    const paciente = resolverPacienteFrequencia(
      porId,
      porNome,
      frequencia,
      sessoes
    );

    const nomeExibicao =
      paciente?.nome || frequencia.paciente_nome || "Paciente";
    const chave = paciente
      ? chavePaciente(paciente)
      : `nome:${nomeExibicao}`;

    const resumo = obterResumo(chave, nomeExibicao, paciente);
    resumo.presencas += 1;

    if (frequencia.sessao_id != null) {
      sessoesContadas.add(String(frequencia.sessao_id));
    }

    const sessaoRelacionada = sessoes.find(
      (s) => String(s.id) === String(frequencia.sessao_id)
    );

    const valorLinha = valorPresenca(paciente, sessaoRelacionada);
    acumularValor(resumo, valorLinha);
  }

  for (const sessao of sessoes) {
    const sid = String(sessao.id);

    if (sessoesComFrequencia.has(sid)) continue;
    if (!isStatusPresente(sessao.status)) continue;
    if (sessoesContadas.has(sid)) continue;

    const paciente = resolverPaciente(
      porId,
      porNome,
      sessao.paciente_id,
      sessao.paciente_nome
    );

    if (!paciente) continue;

    const chaveFaltaSessao = chavePacienteData(
      paciente.id,
      paciente.nome,
      sessao.data
    );
    if (chaveFaltaSessao && faltasPorPacienteData.has(chaveFaltaSessao)) {
      continue;
    }

    const resumo = obterResumo(
      chavePaciente(paciente),
      paciente.nome,
      paciente
    );
    resumo.presencas += 1;
    sessoesContadas.add(sid);
    const valorLinha = valorPresenca(paciente, sessao);
    acumularValor(resumo, valorLinha);
  }

  return Array.from(resumos.values())
    .map((item) => ({
      id: item.id,
      nome: item.nome,
      presencas: item.presencas,
      valor:
        item.presencas > 0
          ? item.total / item.presencas
          : valorSessaoPaciente(item.paciente),
      total: item.total,
    }))
    .filter((item) => item.presencas > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
}
