"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "./lib/auth";
import {
  listarAniversariantesDoMes,
  rotuloDistanciaAniversario,
} from "./lib/datas-paciente";
import { requireUserClient } from "./lib/require-user-client";
import { listFrequenciasResumo, resumoComparecimentoMes } from "./lib/db/frequencia";
import { deduplicarFrequenciasPorSessao } from "./lib/frequencia-utils";
import { listPacientes } from "./lib/db/pacientes";
import { listSessoesAgendadasFuturas, listSessoesDoDia } from "./lib/db/sessoes";
import DashboardAgendaHoje, {
  ordenarSessoesPorHorario,
} from "./components/DashboardAgendaHoje";
import DashboardProximasSessoes from "./components/DashboardProximasSessoes";
import FlashMessage from "./components/FlashMessage";
import Janela from "./components/Janela";
import PendenciasClinica from "./components/PendenciasClinica";
import { montarChecklistUnificado } from "./lib/checklist-clinica";
import type { Frequencia, Paciente, Sessao } from "./types";

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default function Home() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessoesHojeLista, setSessoesHojeLista] = useState<Sessao[]>([]);
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  const [comparecimentoMes, setComparecimentoMes] = useState({
    presencas: 0,
    faltas: 0,
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const agora = new Date();
    const hoje = formatarDataISO(agora);
    const horaAtual = agora.toTimeString().slice(0, 5);

    const mesAtualChave = hoje.slice(0, 7);

    const [pRes, sRes, fRes, hojeRes, comparecimentoRes] = await Promise.all([
      listPacientes(user.id),
      listSessoesAgendadasFuturas(user.id, hoje, horaAtual),
      listFrequenciasResumo(user.id),
      listSessoesDoDia(user.id, hoje),
      resumoComparecimentoMes(user.id, mesAtualChave),
    ]);

    const loadError =
      pRes.error?.message ||
      sRes.error?.message ||
      fRes.error?.message ||
      hojeRes.error?.message ||
      comparecimentoRes.error?.message;

    if (loadError) {
      setErro("Erro ao carregar o dashboard: " + loadError);
      setPacientes([]);
      setSessoes([]);
      setSessoesHojeLista([]);
      setFrequencias([]);
      setComparecimentoMes({ presencas: 0, faltas: 0 });
      setCarregando(false);
      return;
    }

    setPacientes((pRes.data || []) as Paciente[]);
    setSessoes((sRes.data || []) as Sessao[]);
    setSessoesHojeLista(
      ordenarSessoesPorHorario((hojeRes.data || []) as Sessao[])
    );
    setFrequencias(
      deduplicarFrequenciasPorSessao((fRes.data || []) as Frequencia[])
    );
    setComparecimentoMes({
      presencas: comparecimentoRes.presencas,
      faltas: comparecimentoRes.faltas,
    });
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const hoje = formatarDataISO(new Date());

  const pacientesAtivos = pacientes.filter(
    (p) => !p.status || p.status === "ativo"
  ).length;

  const sessoesHoje = sessoesHojeLista;

  const presencas = comparecimentoMes.presencas;
  const faltas = comparecimentoMes.faltas;

  const receitaPrevista = sessoes.reduce(
    (total, sessao) => {
      return total + Number(sessao.valor || 0);
    },
    0
  );

  const totalFrequencias = presencas + faltas;
  const taxaComparecimento =
    totalFrequencias > 0
      ? Math.round((presencas / totalFrequencias) * 100)
      : 0;

  const aniversariantesMes = listarAniversariantesDoMes(pacientes);
  const mesAtual = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(new Date());

  return (
    <div className="dashboard-page">
      <Janela titulo="Dashboard">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

        {carregando ? (
          <p className="empty-text" style={{ marginTop: "12px" }}>
            Carregando dashboard...
          </p>
        ) : (
          <>
        <p className="dashboard-subtitle">
          Visão geral da clínica
        </p>

        <div className="dashboard-overview">
          <DashboardAgendaHoje dataIso={hoje} sessoes={sessoesHojeLista} />

          <div className="dashboard-metrics-grid">
            <DashboardMetric
              label="Pacientes ativos"
              value={pacientesAtivos}
              detail={`${pacientes.length} cadastrados`}
              variant="patients"
            />

            <DashboardMetric
              label="Sessões hoje"
              value={sessoesHoje.length}
              detail={
                sessoes.length > 0
                  ? `${sessoes.length} futuras agendadas`
                  : "Nenhuma sessão futura"
              }
              variant="sessions"
            />

            <DashboardMetric
              label="Comparecimento"
              value={`${taxaComparecimento}%`}
              detail={`${presencas} presenças / ${faltas} faltas no mês`}
              variant="attendance"
            />

            <DashboardMetric
              label="Receita próximas"
              value={formatarMoeda(receitaPrevista)}
              detail={`${sessoes.length} sessões agendadas`}
              variant="revenue"
            />
          </div>
        </div>
          </>
        )}
      </Janela>

      {!carregando ? (
        <div className="dashboard-pendencias">
          <PendenciasClinica
            itens={montarChecklistUnificado(pacientes, sessoes, frequencias)}
            titulo="Pendências da clínica"
          />
        </div>
      ) : null}

      <Janela titulo="Próximas sessões">
        {carregando ? (
          <p className="empty-text">Carregando sessões...</p>
        ) : (
          <DashboardProximasSessoes hojeIso={hoje} sessoes={sessoes} />
        )}
      </Janela>

      <Janela titulo={`Aniversariantes de ${mesAtual}`}>
        {carregando ? (
          <p className="empty-text">Carregando aniversariantes...</p>
        ) : (
          <BirthdayReminder aniversariantes={aniversariantesMes} />
        )}
      </Janela>
    </div>
  );
}

function BirthdayReminder({
  aniversariantes,
}: {
  aniversariantes: ReturnType<typeof listarAniversariantesDoMes>;
}) {
  if (aniversariantes.length === 0) {
    return (
      <div className="birthday-empty-card">
        <strong>Nenhum aniversário cadastrado para este mês</strong>
        <p>
          Cadastre a data de nascimento dos pacientes para ver aniversários
          detalhados aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="birthday-reminder-list">
      {aniversariantes.map(({ paciente, data, idade, diffDias }) => (
        <div
          key={paciente.id}
          className={`birthday-reminder-item${diffDias === 0 ? " is-today" : ""}`}
        >
          <div className="birthday-avatar">
            {paciente.nome.slice(0, 1).toUpperCase()}
          </div>

          <div className="birthday-info">
            <strong>{paciente.nome}</strong>
            <span>{data}</span>
            <p>
              Completa {idade} {idade === 1 ? "ano" : "anos"} este mês.
            </p>
          </div>

          <span className="birthday-distance">
            {rotuloDistanciaAniversario(diffDias)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  detail,
  variant,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  variant: "patients" | "sessions" | "attendance" | "revenue";
}) {
  return (
    <div className={`dashboard-metric-card dashboard-metric-${variant}`}>
      <div className="dashboard-metric-heading">
        <span className="dashboard-metric-icon">
          {variant === "patients"
            ? "P"
            : variant === "sessions"
            ? "S"
            : variant === "attendance"
            ? "%"
            : "R$"}
        </span>

        <span>{label}</span>
      </div>

      <strong className="dashboard-metric-value">
        {value}
      </strong>

      <p>{detail}</p>
    </div>
  );
}
