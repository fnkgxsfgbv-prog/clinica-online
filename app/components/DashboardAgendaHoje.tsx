"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  proximaSessaoHojeId,
  resumoDia,
  rotuloResumoDia,
} from "../lib/dashboard-agenda-hoje";
import { visualFrequenciaAgenda } from "../lib/status";
import type { Sessao } from "../types";

export { ordenarSessoesPorHorario } from "../lib/dashboard-agenda-hoje";

function formatarHorario(hora?: string | null) {
  return hora ? hora.slice(0, 5) : "--:--";
}

function rotuloDiaHoje(dataIso: string) {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(
    new Date(
      Number(dataIso.slice(0, 4)),
      Number(dataIso.slice(5, 7)) - 1,
      Number(dataIso.slice(8, 10))
    )
  );

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function iniciais(nome?: string | null) {
  return (nome || "Paciente").trim().slice(0, 2).toUpperCase();
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

type Props = {
  dataIso: string;
  sessoes: Sessao[];
};

export default function DashboardAgendaHoje({ dataIso, sessoes }: Props) {
  const router = useRouter();
  const resumo = resumoDia(sessoes);
  const proximaId = proximaSessaoHojeId(sessoes);
  const resumoChips = rotuloResumoDia(resumo, sessoes.length);

  return (
    <section className="dashboard-day-calendar" aria-label="Agenda de hoje">
      <div className="dashboard-day-calendar-header">
        <div className="dashboard-day-header-top">
          <div className="dashboard-day-title-wrap">
            <span className="dashboard-day-eyebrow">Hoje</span>
            <strong>Agenda do dia</strong>
            <span className="dashboard-day-date">{rotuloDiaHoje(dataIso)}</span>
          </div>

          <Link href="/agenda" className="btn btn-outline dashboard-day-link">
            Abrir agenda
          </Link>
        </div>

        {sessoes.length > 0 ? (
          <div className="dashboard-day-stats" aria-label="Resumo do dia">
            {resumoChips.map((chip) => (
              <span
                key={chip.key}
                className={`dashboard-day-stat${chip.className ? ` ${chip.className}` : ""}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {sessoes.length === 0 ? (
        <div className="dashboard-day-empty-card">
          <strong>Nenhuma sessão hoje</strong>
          <p>Quando houver consultas marcadas, elas aparecem aqui em ordem de horário.</p>
        </div>
      ) : (
        <div className="dashboard-day-schedule">
          {sessoes.map((sessao, index) => {
            const freq = visualFrequenciaAgenda(sessao.status);
            const isProxima =
              proximaId != null && String(sessao.id) === String(proximaId);
            const valor = Number(sessao.valor || 0);

            return (
              <div
                key={sessao.id}
                className={`dashboard-day-row${isProxima ? " is-next" : ""}`}
              >
                <div className="dashboard-day-rail" aria-hidden="true">
                  <span className="dashboard-day-rail-time">
                    {formatarHorario(sessao.hora)}
                  </span>
                  <span className={`dashboard-day-rail-dot ${freq.classe}`} />
                  {index < sessoes.length - 1 ? (
                    <span className="dashboard-day-rail-line" />
                  ) : null}
                </div>

                <button
                  type="button"
                  className={`dashboard-day-card ${freq.classe}${
                    isProxima ? " is-next" : ""
                  }`}
                  title={sessao.paciente_nome || "Paciente"}
                  onClick={() => router.push(`/sessao/${sessao.id}`)}
                >
                  <span className="dashboard-day-card-avatar">
                    {iniciais(sessao.paciente_nome)}
                  </span>

                  <span className="dashboard-day-card-body">
                    <span className="dashboard-day-card-top">
                      <strong>{sessao.paciente_nome || "Paciente"}</strong>
                      {isProxima ? (
                        <span className="dashboard-day-next-label">Próxima</span>
                      ) : null}
                    </span>
                    <span className="dashboard-day-card-meta">
                      <span
                        className={`dashboard-day-status ${freq.classe}`}
                      >
                        {freq.rotulo}
                      </span>
                      {valor > 0 ? (
                        <span className="dashboard-day-value">
                          {formatarMoeda(valor)}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="dashboard-day-card-action">Abrir</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
