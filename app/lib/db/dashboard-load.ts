import { ultimoDiaMesChave } from "../mes";
import {
  listPacientesAniversariantesDoMes,
  listPacientesResumoChecklist,
  resumoContagemPacientes,
  type ResumoContagemPacientes,
} from "./pacientes";
import {
  listFrequenciasPorIntervalo,
  resumoComparecimentoMes,
} from "./frequencia";
import {
  listSessoesAgendadasFuturas,
  listSessoesDesde,
  listSessoesDoDia,
} from "./sessoes";
import type { Frequencia, Paciente, Sessao } from "../../types";

function dataIsoDesdeDiasAtras(dias: number, base = new Date()) {
  const data = new Date(base);
  data.setDate(data.getDate() - dias);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export type DashboardHomeData = {
  contagemPacientes: ResumoContagemPacientes;
  pacientesChecklist: Paciente[];
  aniversariantesPacientes: Paciente[];
  sessoesFuturas: Sessao[];
  sessoesHoje: Sessao[];
  sessoesChecklist: Sessao[];
  frequenciasMes: Frequencia[];
  comparecimentoMes: { presencas: number; faltas: number };
};

/** Carrega o painel inicial com consultas enxutas (sem listar todos os pacientes). */
export async function carregarDashboardHome(
  userId: string,
  opcoes: { hoje: string; horaAtual: string; mesAtualChave: string }
) {
  const { hoje, horaAtual, mesAtualChave } = opcoes;
  const inicioMes = `${mesAtualChave}-01`;
  const desdeChecklist = dataIsoDesdeDiasAtras(30);

  const [
    contagemRes,
    checklistRes,
    aniversariantesRes,
    futurasRes,
    hojeRes,
    sessoesChecklistRes,
    frequenciasMesRes,
    comparecimentoRes,
  ] = await Promise.all([
    resumoContagemPacientes(userId),
    listPacientesResumoChecklist(userId),
    listPacientesAniversariantesDoMes(userId),
    listSessoesAgendadasFuturas(userId, hoje, horaAtual),
    listSessoesDoDia(userId, hoje),
    listSessoesDesde(userId, desdeChecklist),
    listFrequenciasPorIntervalo(userId, inicioMes, ultimoDiaMesChave(mesAtualChave)),
    resumoComparecimentoMes(userId, mesAtualChave),
  ]);

  const error =
    contagemRes.error?.message ||
    checklistRes.error?.message ||
    aniversariantesRes.error?.message ||
    futurasRes.error?.message ||
    hojeRes.error?.message ||
    sessoesChecklistRes.error?.message ||
    frequenciasMesRes.error?.message ||
    comparecimentoRes.error?.message;

  if (error || !contagemRes.data) {
    return { data: null, error: error || "Erro ao carregar contagens." };
  }

  return {
    data: {
      contagemPacientes: contagemRes.data,
      pacientesChecklist: (checklistRes.data || []) as Paciente[],
      aniversariantesPacientes: (aniversariantesRes.data || []) as Paciente[],
      sessoesFuturas: (futurasRes.data || []) as Sessao[],
      sessoesHoje: (hojeRes.data || []) as Sessao[],
      sessoesChecklist: (sessoesChecklistRes.data || []) as Sessao[],
      frequenciasMes: (frequenciasMesRes.data || []) as Frequencia[],
      comparecimentoMes: {
        presencas: comparecimentoRes.presencas,
        faltas: comparecimentoRes.faltas,
      },
    } satisfies DashboardHomeData,
    error: null,
  };
}

export { dataIsoHoje } from "../datas-paciente";
