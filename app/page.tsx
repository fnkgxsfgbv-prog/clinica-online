"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "./lib/auth";
import {
  dataIsoAmanhaAPartirDe,
  listarAniversariantesDoMes,
  rotuloDistanciaAniversario,
} from "./lib/datas-paciente";
import { dataReferenciaISO } from "./lib/financeiro";
import { requireUserClient } from "./lib/require-user-client";
import { listFrequenciasResumo } from "./lib/db/frequencia";
import { deduplicarFrequenciasPorSessao } from "./lib/frequencia-utils";
import { isStatusFaltou, isStatusPresente } from "./lib/status";
import { listPacientes } from "./lib/db/pacientes";
import { listSessoesAgendadasFuturas, listSessoesDoDia } from "./lib/db/sessoes";
import DashboardAgendaHoje, {
  ordenarSessoesPorHorario,
} from "./components/DashboardAgendaHoje";
import FlashMessage from "./components/FlashMessage";
import Janela from "./components/Janela";
import type { Frequencia, Paciente, Sessao } from "./types";

function formatarDataISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function criarDataLocal(dataSessao: string) {
  const [ano, mes, dia] = dataSessao.split("-").map(Number);

  return new Date(ano, mes - 1, dia);
}

function formatarDataCompleta(dataSessao: string) {
  if (!dataSessao) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(criarDataLocal(dataSessao));
}

function rotuloDia(dataSessao: string, hoje: string) {
  if (!dataSessao) return "Sem data";

  const data = criarDataLocal(dataSessao);
  const dataHoje = criarDataLocal(hoje);
  const diferenca = Math.round(
    (data.getTime() - dataHoje.getTime()) / 86400000
  );

  if (diferenca === 0) return "Hoje";
  if (diferenca === 1) return "Amanhã";
  if (diferenca > 1 && diferenca <= 6) return "Esta semana";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(data);
}

function formatarHorario(hora?: string | null) {
  return hora ? hora.slice(0, 5) : "--:--";
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
  const [sessoesAmanhaLista, setSessoesAmanhaLista] = useState<Sessao[]>([]);
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
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
    const amanha = dataIsoAmanhaAPartirDe(hoje);
    const horaAtual = agora.toTimeString().slice(0, 5);

    const [pRes, sRes, fRes, hojeRes, amanhaRes] = await Promise.all([
      listPacientes(user.id),
      listSessoesAgendadasFuturas(user.id, hoje, horaAtual),
      listFrequenciasResumo(user.id),
      listSessoesDoDia(user.id, hoje),
      listSessoesDoDia(user.id, amanha),
    ]);

    const loadError =
      pRes.error?.message ||
      sRes.error?.message ||
      fRes.error?.message ||
      hojeRes.error?.message ||
      amanhaRes.error?.message;

    if (loadError) {
      setErro("Erro ao carregar o dashboard: " + loadError);
      setPacientes([]);
      setSessoes([]);
      setSessoesHojeLista([]);
      setSessoesAmanhaLista([]);
      setFrequencias([]);
      setCarregando(false);
      return;
    }

    setPacientes((pRes.data || []) as Paciente[]);
    setSessoes((sRes.data || []) as Sessao[]);
    setSessoesHojeLista(
      ordenarSessoesPorHorario((hojeRes.data || []) as Sessao[])
    );
    setSessoesAmanhaLista(
      ordenarSessoesPorHorario((amanhaRes.data || []) as Sessao[])
    );
    setFrequencias(
      deduplicarFrequenciasPorSessao((fRes.data || []) as Frequencia[])
    );
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

  const presencas = frequencias.filter((f) => isStatusPresente(f.status)).length;

  const faltas = frequencias.filter((f) => isStatusFaltou(f.status)).length;

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
              detail={`${presencas} presenças / ${faltas} faltas`}
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

      <Janela titulo="Sessões de amanhã">
        {carregando ? (
          <p className="empty-text">Carregando agenda de amanhã...</p>
        ) : sessoesAmanhaLista.length === 0 ? (
          <p className="empty-text">Nenhuma sessão agendada para amanhã.</p>
        ) : (
          <>
            <div className="next-session-list">
              {sessoesAmanhaLista.map((s) => (
                <div key={s.id} className="next-session-item">
                  <div className="next-session-time">
                    <strong>{formatarHorario(s.hora)}</strong>
                    <span>Amanhã</span>
                  </div>
                  <div className="next-session-info">
                    <strong>{s.paciente_nome || "Paciente"}</strong>
                    <p>{formatarDataCompleta(s.data)}</p>
                  </div>
                  <div className="next-session-meta">
                    <span className="next-session-status">
                      {s.status || "Agendada"}
                    </span>
                    <span>{formatarMoeda(Number(s.valor || 0))}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => router.push(`/sessao/${s.id}`)}
                  >
                    Abrir sessão
                  </button>
                </div>
              ))}
            </div>
            <p className="dashboard-amanha-link">
              <Link className="btn btn-outline" href="/agenda">
                Ver agenda completa
              </Link>
            </p>
          </>
        )}
      </Janela>

      <Janela titulo={`Aniversariantes de ${mesAtual}`}>
        {carregando ? (
          <p className="empty-text">Carregando aniversariantes...</p>
        ) : (
          <BirthdayReminder aniversariantes={aniversariantesMes} />
        )}
      </Janela>

      <Janela titulo="Próximas Sessões">
        {carregando ? (
          <p className="empty-text">Carregando sessões...</p>
        ) : sessoes.length === 0 ? (
          <p className="empty-text">
            Nenhuma sessão agendada.
          </p>
        ) : (
          <div className="next-session-list">
            {sessoes.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className={`next-session-item ${
                  dataReferenciaISO(s.data) === hoje ? "is-today" : ""
                }`}
              >
                <div className="next-session-time">
                  <strong>{formatarHorario(s.hora)}</strong>
                  <span>{rotuloDia(s.data, hoje)}</span>
                </div>

                <div className="next-session-info">
                  <strong>
                    {s.paciente_nome || "Paciente"}
                  </strong>

                  <p>
                    {formatarDataCompleta(s.data)}
                  </p>
                </div>

                <div className="next-session-meta">
                  <span className="next-session-status">
                    {s.status || "Agendada"}
                  </span>

                  <span>
                    {formatarMoeda(Number(s.valor || 0))}
                  </span>
                </div>

                <button
                  className="btn btn-outline"
                  onClick={() =>
                    router.push(`/sessao/${s.id}`)
                  }
                >
                  Abrir sessão
                </button>
              </div>
            ))}
          </div>
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
          Cadastre a data de nascimento dos pacientes para receber lembretes
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
