"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "./lib/auth";
import { listFrequencias } from "./lib/db/frequencia";
import { isStatusFaltou, isStatusPresente } from "./lib/status";
import { listPacientes } from "./lib/db/pacientes";
import { listSessoesAgendadasFuturas } from "./lib/db/sessoes";
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
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);

  const carregarDados = useCallback(async () => {
    const user = await getCurrentUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const agora = new Date();
    const hoje = formatarDataISO(agora);
    const horaAtual = agora.toTimeString().slice(0, 5);

    const [
      { data: pacientesData },
      { data: sessoesData },
      { data: frequenciasData },
    ] = await Promise.all([
      listPacientes(user.id),
      listSessoesAgendadasFuturas(user.id, hoje, horaAtual),
      listFrequencias(user.id),
    ]);

    setPacientes((pacientesData || []) as Paciente[]);
    setSessoes((sessoesData || []) as Sessao[]);
    setFrequencias((frequenciasData || []) as Frequencia[]);
  }, [router]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const hoje = formatarDataISO(new Date());

  const pacientesAtivos = pacientes.filter(
    (p) => !p.status || p.status === "ativo"
  ).length;

  const sessoesHoje = sessoes.filter(
    (s) => s.data === hoje
  );

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

  const proximaSessao = sessoes[0];

  return (
    <div className="dashboard-page">
      <Janela titulo="Dashboard">
        <p className="dashboard-subtitle">
          Visão geral da clínica
        </p>

        <div className="dashboard-overview">
          <div className="dashboard-next-card">
            <span className="dashboard-eyebrow">
              Próxima sessão
            </span>

            {proximaSessao ? (
              <>
                <strong>
                  {proximaSessao.paciente_nome || "Paciente"}
                </strong>

                <p>
                  {rotuloDia(proximaSessao.data, hoje)} às{" "}
                  {formatarHorario(proximaSessao.hora)}
                </p>

                <button
                  className="btn btn-green"
                  onClick={() =>
                    router.push(`/sessao/${proximaSessao.id}`)
                  }
                >
                  Abrir sessão
                </button>
              </>
            ) : (
              <>
                <strong>Nenhuma sessão agendada</strong>
                <p>Quando houver agenda, ela aparecerá aqui.</p>
              </>
            )}
          </div>

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
              detail={`${sessoes.length} próximas`}
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
      </Janela>

      <Janela titulo="Próximas Sessões">
        {sessoes.length === 0 ? (
          <p className="empty-text">
            Nenhuma sessão agendada.
          </p>
        ) : (
          <div className="next-session-list">
            {sessoes.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className={`next-session-item ${
                  s.data === hoje ? "is-today" : ""
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
