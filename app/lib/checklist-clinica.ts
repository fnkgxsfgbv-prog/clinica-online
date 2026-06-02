import { dataIsoHoje } from "./datas-paciente";
import { dataReferenciaISO } from "./financeiro";
import { diagnosticarIntegracaoFinanceiro } from "./financeiro-diagnostico";
import { extrairDataInicioAtendimento } from "./paciente-metadata";
import { timestampDataHora } from "./ordenar-datas";
import { isStatusCancelada, isStatusFaltou } from "./status";
import type { Frequencia, Paciente, Sessao } from "../types";

export type ItemChecklistClinica = {
  id: string;
  categoria: "cadastro" | "integracao" | "rotina";
  titulo: string;
  valor: number;
  descricao: string;
  tom?: "ok" | "warn";
  href?: string;
};

function statusNormalizado(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function pacienteAtivo(paciente: Paciente) {
  const status = statusNormalizado(paciente.status);
  return !status || status === "ativo";
}

function sessoesDoMes(sessoes: Sessao[], mesAtual: string) {
  return sessoes.filter((sessao) => String(sessao.data || "").startsWith(mesAtual));
}

function montarChecklistCadastro(pacientes: Paciente[]): ItemChecklistClinica[] {
  const ativos = pacientes.filter(pacienteAtivo);

  return [
    {
      id: "cadastro-sem-telefone",
      categoria: "cadastro",
      titulo: "Sem telefone",
      valor: ativos.filter((paciente) => !String(paciente.telefone || "").trim()).length,
      descricao: "Pacientes ativos sem contato cadastrado.",
      tom: "warn",
      href: "/pacientes",
    },
    {
      id: "cadastro-sem-nascimento",
      categoria: "cadastro",
      titulo: "Sem nascimento",
      valor: ativos.filter((paciente) => !paciente.data_nascimento).length,
      descricao: "Importante para idade cronológica e aniversários.",
      tom: "warn",
      href: "/pacientes",
    },
    {
      id: "cadastro-sem-cid",
      categoria: "cadastro",
      titulo: "Sem CID",
      valor: ativos.filter((paciente) => !String(paciente.cid || "").trim()).length,
      descricao: "Prontuários que ainda podem ser completados.",
      tom: "warn",
      href: "/pacientes",
    },
    {
      id: "cadastro-sem-inicio",
      categoria: "cadastro",
      titulo: "Sem início",
      valor: ativos.filter((paciente) => !extrairDataInicioAtendimento(paciente)).length,
      descricao: "Falta data de início do atendimento.",
      tom: "warn",
      href: "/pacientes",
    },
    {
      id: "cadastro-sem-valor",
      categoria: "cadastro",
      titulo: "Sem valor de sessão",
      valor: ativos.filter(
        (paciente) =>
          !String(paciente.valor_sessao || paciente.valor || "").trim()
      ).length,
      descricao: "Pacientes ativos sem valor por sessão no cadastro.",
      tom: "warn",
      href: "/pacientes",
    },
  ];
}

function montarChecklistRotina(
  pacientes: Paciente[],
  sessoes: Sessao[]
): ItemChecklistClinica[] {
  const hoje = dataIsoHoje();
  const mesAtual = hoje.slice(0, 7);
  const mesAtualNum = hoje.slice(5, 7);
  const sessoesMes = sessoesDoMes(sessoes, mesAtual);
  const limiteRecente = new Date();
  limiteRecente.setDate(limiteRecente.getDate() - 30);

  const pacientesAtivos = pacientes.filter(pacienteAtivo);
  const pacientesSemSessaoRecente = pacientesAtivos.filter((paciente) => {
    const ultimaSessao = sessoes
      .filter((sessao) => String(sessao.paciente_id) === String(paciente.id))
      .map((sessao) => timestampDataHora(sessao.data, sessao.hora))
      .filter((ts) => ts > 0)
      .sort((a, b) => b - a)[0];

    return !ultimaSessao || ultimaSessao < limiteRecente.getTime();
  }).length;

  return [
    {
      id: "rotina-aniversarios",
      categoria: "rotina",
      titulo: "Aniversários do mês",
      valor: pacientesAtivos.filter((paciente) =>
        String(paciente.data_nascimento || "").slice(5, 7) === mesAtualNum
      ).length,
      descricao: "Pacientes ativos com aniversário neste mês.",
      href: "/",
    },
    {
      id: "rotina-sessoes-hoje",
      categoria: "rotina",
      titulo: "Sessões de hoje",
      valor: sessoes.filter((sessao) => dataReferenciaISO(sessao.data) === hoje).length,
      descricao: "Atendimentos previstos para hoje.",
      href: "/agenda",
    },
    {
      id: "rotina-faltas",
      categoria: "rotina",
      titulo: "Faltas/cancelamentos",
      valor: sessoesMes.filter(
        (sessao) =>
          isStatusFaltou(sessao.status) || isStatusCancelada(sessao.status)
      ).length,
      descricao: "Ocorrências registradas no mês atual.",
      tom: "warn",
      href: "/agenda",
    },
    {
      id: "rotina-sem-sessao-recente",
      categoria: "rotina",
      titulo: "Sem sessão recente",
      valor: pacientesSemSessaoRecente,
      descricao: "Pacientes ativos sem sessão nos últimos 30 dias.",
      tom: "warn",
      href: "/pacientes",
    },
  ];
}

function montarChecklistIntegracao(
  pacientes: Paciente[],
  frequencias: Frequencia[],
  sessoes: Sessao[],
  mesAtual?: string
): ItemChecklistClinica[] {
  const alertas = diagnosticarIntegracaoFinanceiro(
    pacientes,
    frequencias,
    sessoes,
    mesAtual
  );

  const semVinculo = alertas.filter((a) => a.tipo === "sem_vinculo").length;
  const semValor = alertas.filter((a) => a.tipo === "sem_valor").length;

  return [
    {
      id: "integracao-sem-vinculo",
      categoria: "integracao",
      titulo: "Presenças sem vínculo",
      valor: semVinculo,
      descricao:
        "Presenças na frequência sem sessão correspondente na agenda.",
      tom: "warn",
      href: "/financeiro",
    },
    {
      id: "integracao-sem-valor",
      categoria: "integracao",
      titulo: "Presenças sem valor",
      valor: semValor,
      descricao:
        "Presenças sem valor na sessão nem no cadastro do paciente.",
      tom: "warn",
      href: "/financeiro",
    },
  ];
}

export function montarChecklistUnificado(
  pacientes: Paciente[],
  sessoes: Sessao[],
  frequencias: Frequencia[] = [],
  mesAtual?: string
): ItemChecklistClinica[] {
  const mes = mesAtual || dataIsoHoje().slice(0, 7);

  return [
    ...montarChecklistIntegracao(pacientes, frequencias, sessoes, mes),
    ...montarChecklistCadastro(pacientes),
    ...montarChecklistRotina(pacientes, sessoes),
  ];
}

export function filtrarPendenciasChecklist(
  itens: ItemChecklistClinica[]
): ItemChecklistClinica[] {
  return itens.filter((item) => item.tom === "warn" && item.valor > 0);
}

export function totalPendenciasChecklist(itens: ItemChecklistClinica[]): number {
  return filtrarPendenciasChecklist(itens).reduce(
    (total, item) => total + item.valor,
    0
  );
}
