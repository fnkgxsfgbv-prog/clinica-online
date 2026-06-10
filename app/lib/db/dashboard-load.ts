import { ultimoDiaMesChave } from "../mes";
import {
  listPacientes,
  listPacientesAniversariantesDoMes,
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

function listaOuVazio<T>(res: { data: T[] | null; error: unknown }): T[] {
  if (res.error) return [];
  return res.data || [];
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

/** Carrega o painel inicial; falha só se contagens ou pacientes não carregarem. */
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
    listPacientes(userId),
    listPacientesAniversariantesDoMes(userId),
    listSessoesAgendadasFuturas(userId, hoje, horaAtual),
    listSessoesDoDia(userId, hoje),
    listSessoesDesde(userId, desdeChecklist),
    listFrequenciasPorIntervalo(userId, inicioMes, ultimoDiaMesChave(mesAtualChave)),
    resumoComparecimentoMes(userId, mesAtualChave),
  ]);

  const erroCritico =
    contagemRes.error?.message ||
    checklistRes.error?.message ||
    (!contagemRes.data ? "Erro ao carregar contagens." : null);

  if (erroCritico) {
    return { data: null, error: erroCritico };
  }

  return {
    data: {
      contagemPacientes: contagemRes.data!,
      pacientesChecklist: listaOuVazio(checklistRes),
      aniversariantesPacientes: listaOuVazio(aniversariantesRes),
      sessoesFuturas: listaOuVazio(futurasRes),
      sessoesHoje: listaOuVazio(hojeRes),
      sessoesChecklist: listaOuVazio(sessoesChecklistRes),
      frequenciasMes: listaOuVazio(frequenciasMesRes),
      comparecimentoMes: comparecimentoRes.error
        ? { presencas: 0, faltas: 0 }
        : {
            presencas: comparecimentoRes.presencas,
            faltas: comparecimentoRes.faltas,
          },
    } satisfies DashboardHomeData,
    error: null,
  };
}

export { dataIsoHoje } from "../datas-paciente";
