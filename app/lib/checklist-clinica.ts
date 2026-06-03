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

export type LinhaPendencia = {
  id: string;
  titulo: string;
  detalhe: string;
  href: string;
  rotuloAcao?: string;
};

export const PENDENCIA_TIPOS = [
  "integracao-sem-vinculo",
  "integracao-sem-valor",
  "cadastro-sem-telefone",
  "cadastro-sem-nascimento",
  "cadastro-sem-cid",
  "cadastro-sem-inicio",
  "cadastro-sem-valor",
  "rotina-sem-sessao-recente",
] as const;

export type PendenciaTipoId = (typeof PENDENCIA_TIPOS)[number];

export function hrefPendencia(tipo: string): string {
  return `/minha-clinica/pendencias?tipo=${encodeURIComponent(tipo)}`;
}

export function isPendenciaTipoId(tipo: string): tipo is PendenciaTipoId {
  return (PENDENCIA_TIPOS as readonly string[]).includes(tipo);
}

export type PendenciaCadastroPaciente = {
  tipo: PendenciaTipoId;
  titulo: string;
};

/** Pendências de cadastro de um paciente ativo (para badge na lista). */
export function pendenciasCadastroPaciente(
  paciente: Paciente
): PendenciaCadastroPaciente[] {
  if (!pacienteAtivo(paciente)) return [];

  const pendencias: PendenciaCadastroPaciente[] = [];

  if (!String(paciente.telefone || "").trim()) {
    pendencias.push({
      tipo: "cadastro-sem-telefone",
      titulo: "Sem telefone",
    });
  }
  if (!paciente.data_nascimento) {
    pendencias.push({
      tipo: "cadastro-sem-nascimento",
      titulo: "Sem nascimento",
    });
  }
  if (!String(paciente.cid || "").trim()) {
    pendencias.push({ tipo: "cadastro-sem-cid", titulo: "Sem CID" });
  }
  if (!extrairDataInicioAtendimento(paciente)) {
    pendencias.push({
      tipo: "cadastro-sem-inicio",
      titulo: "Sem início",
    });
  }
  if (!String(paciente.valor_sessao || paciente.valor || "").trim()) {
    pendencias.push({
      tipo: "cadastro-sem-valor",
      titulo: "Sem valor de sessão",
    });
  }

  return pendencias;
}

function statusNormalizado(status?: string | null) {
  return String(status || "").trim().toLowerCase();
}

function pacienteAtivo(paciente: Paciente) {
  const status = statusNormalizado(paciente.status);
  return !status || status === "ativo";
}

function pacientesAtivos(pacientes: Paciente[]) {
  return pacientes.filter(pacienteAtivo);
}

function pacientesSemTelefone(pacientes: Paciente[]) {
  return pacientesAtivos(pacientes).filter(
    (paciente) => !String(paciente.telefone || "").trim()
  );
}

function pacientesSemNascimento(pacientes: Paciente[]) {
  return pacientesAtivos(pacientes).filter((paciente) => !paciente.data_nascimento);
}

function pacientesSemCid(pacientes: Paciente[]) {
  return pacientesAtivos(pacientes).filter(
    (paciente) => !String(paciente.cid || "").trim()
  );
}

function pacientesSemInicio(pacientes: Paciente[]) {
  return pacientesAtivos(pacientes).filter(
    (paciente) => !extrairDataInicioAtendimento(paciente)
  );
}

function pacientesSemValorSessao(pacientes: Paciente[]) {
  return pacientesAtivos(pacientes).filter(
    (paciente) => !String(paciente.valor_sessao || paciente.valor || "").trim()
  );
}

function pacientesSemSessaoRecente(pacientes: Paciente[], sessoes: Sessao[]) {
  const limiteRecente = new Date();
  limiteRecente.setDate(limiteRecente.getDate() - 30);

  return pacientesAtivos(pacientes).filter((paciente) => {
    const ultimaSessao = sessoes
      .filter((sessao) => String(sessao.paciente_id) === String(paciente.id))
      .map((sessao) => timestampDataHora(sessao.data, sessao.hora))
      .filter((ts) => ts > 0)
      .sort((a, b) => b - a)[0];

    return !ultimaSessao || ultimaSessao < limiteRecente.getTime();
  });
}

function linhaPaciente(
  paciente: Paciente,
  detalhe: string,
  editar = true
): LinhaPendencia {
  return {
    id: String(paciente.id),
    titulo: paciente.nome,
    detalhe,
    href: editar ? `/paciente/${paciente.id}/editar` : `/paciente/${paciente.id}`,
    rotuloAcao: editar ? "Editar" : "Abrir",
  };
}

function sessoesDoMes(sessoes: Sessao[], mesAtual: string) {
  return sessoes.filter((sessao) => String(sessao.data || "").startsWith(mesAtual));
}

function montarChecklistCadastro(pacientes: Paciente[]): ItemChecklistClinica[] {
  return [
    {
      id: "cadastro-sem-telefone",
      categoria: "cadastro",
      titulo: "Sem telefone",
      valor: pacientesSemTelefone(pacientes).length,
      descricao: "Pacientes ativos sem contato cadastrado.",
      tom: "warn",
      href: hrefPendencia("cadastro-sem-telefone"),
    },
    {
      id: "cadastro-sem-nascimento",
      categoria: "cadastro",
      titulo: "Sem nascimento",
      valor: pacientesSemNascimento(pacientes).length,
      descricao: "Importante para idade cronológica e aniversários.",
      tom: "warn",
      href: hrefPendencia("cadastro-sem-nascimento"),
    },
    {
      id: "cadastro-sem-cid",
      categoria: "cadastro",
      titulo: "Sem CID",
      valor: pacientesSemCid(pacientes).length,
      descricao: "Prontuários que ainda podem ser completados.",
      tom: "warn",
      href: hrefPendencia("cadastro-sem-cid"),
    },
    {
      id: "cadastro-sem-inicio",
      categoria: "cadastro",
      titulo: "Sem início",
      valor: pacientesSemInicio(pacientes).length,
      descricao: "Falta data de início do atendimento.",
      tom: "warn",
      href: hrefPendencia("cadastro-sem-inicio"),
    },
    {
      id: "cadastro-sem-valor",
      categoria: "cadastro",
      titulo: "Sem valor de sessão",
      valor: pacientesSemValorSessao(pacientes).length,
      descricao: "Pacientes ativos sem valor por sessão no cadastro.",
      tom: "warn",
      href: hrefPendencia("cadastro-sem-valor"),
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

  const ativos = pacientesAtivos(pacientes);
  const semSessaoRecente = pacientesSemSessaoRecente(pacientes, sessoes);

  return [
    {
      id: "rotina-aniversarios",
      categoria: "rotina",
      titulo: "Aniversários do mês",
      valor: ativos.filter((paciente) =>
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
      valor: semSessaoRecente.length,
      descricao: "Pacientes ativos sem sessão nos últimos 30 dias.",
      tom: "warn",
      href: hrefPendencia("rotina-sem-sessao-recente"),
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
      href: hrefPendencia("integracao-sem-vinculo"),
    },
    {
      id: "integracao-sem-valor",
      categoria: "integracao",
      titulo: "Presenças sem valor",
      valor: semValor,
      descricao:
        "Presenças sem valor na sessão nem no cadastro do paciente.",
      tom: "warn",
      href: hrefPendencia("integracao-sem-valor"),
    },
  ];
}

export function obterItemChecklist(
  tipo: string,
  pacientes: Paciente[],
  sessoes: Sessao[],
  frequencias: Frequencia[] = [],
  mesAtual?: string
): ItemChecklistClinica | undefined {
  return montarChecklistUnificado(pacientes, sessoes, frequencias, mesAtual).find(
    (item) => item.id === tipo
  );
}

export function listarLinhasPendencia(
  tipo: PendenciaTipoId,
  pacientes: Paciente[],
  sessoes: Sessao[],
  frequencias: Frequencia[] = [],
  mesAtual?: string
): LinhaPendencia[] {
  const mes = mesAtual || dataIsoHoje().slice(0, 7);

  switch (tipo) {
    case "integracao-sem-vinculo":
      return diagnosticarIntegracaoFinanceiro(pacientes, frequencias, sessoes, mes)
        .filter((alerta) => alerta.tipo === "sem_vinculo")
        .map((alerta) => ({
          id: alerta.id,
          titulo: alerta.titulo,
          detalhe: alerta.detalhe,
          href: alerta.href || "/agenda",
          rotuloAcao: alerta.href?.startsWith("/sessao/") ? "Ver sessão" : "Ver agenda",
        }));
    case "integracao-sem-valor":
      return diagnosticarIntegracaoFinanceiro(pacientes, frequencias, sessoes, mes)
        .filter((alerta) => alerta.tipo === "sem_valor")
        .map((alerta) => ({
          id: alerta.id,
          titulo: alerta.titulo,
          detalhe: alerta.detalhe,
          href: alerta.href || "/financeiro",
          rotuloAcao: alerta.href?.includes("/editar") ? "Editar" : "Abrir",
        }));
    case "cadastro-sem-telefone":
      return pacientesSemTelefone(pacientes)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((paciente) =>
          linhaPaciente(paciente, "Sem telefone cadastrado.")
        );
    case "cadastro-sem-nascimento":
      return pacientesSemNascimento(pacientes)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((paciente) =>
          linhaPaciente(paciente, "Sem data de nascimento.")
        );
    case "cadastro-sem-cid":
      return pacientesSemCid(pacientes)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((paciente) => linhaPaciente(paciente, "Sem CID no prontuário."));
    case "cadastro-sem-inicio":
      return pacientesSemInicio(pacientes)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((paciente) =>
          linhaPaciente(paciente, "Sem data de início do atendimento.")
        );
    case "cadastro-sem-valor":
      return pacientesSemValorSessao(pacientes)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((paciente) =>
          linhaPaciente(paciente, "Sem valor por sessão no cadastro.")
        );
    case "rotina-sem-sessao-recente":
      return pacientesSemSessaoRecente(pacientes, sessoes)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((paciente) =>
          linhaPaciente(
            paciente,
            "Nenhuma sessão nos últimos 30 dias.",
            false
          )
        );
    default:
      return [];
  }
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

const PENDENCIA_CADASTRO_TIPOS = new Set<PendenciaTipoId>([
  "cadastro-sem-telefone",
  "cadastro-sem-nascimento",
  "cadastro-sem-cid",
  "cadastro-sem-inicio",
  "cadastro-sem-valor",
]);

export function isPendenciaCadastro(
  tipo: PendenciaTipoId
): tipo is PendenciaTipoId {
  return PENDENCIA_CADASTRO_TIPOS.has(tipo);
}

export function rotuloCampoPendenciaCadastro(tipo: PendenciaTipoId): string {
  switch (tipo) {
    case "cadastro-sem-telefone":
      return "Telefone";
    case "cadastro-sem-nascimento":
      return "Nascimento";
    case "cadastro-sem-cid":
      return "CID";
    case "cadastro-sem-inicio":
      return "Início do atendimento";
    case "cadastro-sem-valor":
      return "Valor da sessão";
    default:
      return "Campo";
  }
}

export function listarPacientesPendencia(
  tipo: PendenciaTipoId,
  pacientes: Paciente[],
  sessoes: Sessao[] = []
): Paciente[] {
  switch (tipo) {
    case "cadastro-sem-telefone":
      return pacientesSemTelefone(pacientes).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    case "cadastro-sem-nascimento":
      return pacientesSemNascimento(pacientes).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    case "cadastro-sem-cid":
      return pacientesSemCid(pacientes).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    case "cadastro-sem-inicio":
      return pacientesSemInicio(pacientes).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    case "cadastro-sem-valor":
      return pacientesSemValorSessao(pacientes).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    case "rotina-sem-sessao-recente":
      return pacientesSemSessaoRecente(pacientes, sessoes).sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );
    default:
      return [];
  }
}
