"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import EmptyState from "./ui/EmptyState";
import {
  agruparProximasSessoes,
  type GrupoProximasSessoes,
} from "../lib/dashboard-agenda-hoje";
import type { Sessao } from "../types";

function formatarHorario(hora?: string | null) {
  return hora ? hora.slice(0, 5) : "--:--";
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

type Props = {
  hojeIso: string;
  sessoes: Sessao[];
};

export default function DashboardProximasSessoes({ hojeIso, sessoes }: Props) {
  const router = useRouter();
  const grupos = agruparProximasSessoes(sessoes, hojeIso);

  if (grupos.length === 0) {
    return (
      <EmptyState
        compact
        inline
        titulo="Nenhuma sessão a partir de amanhã"
        descricao="As próximas sessões agendadas aparecerão aqui."
        icone="🗓"
        acao={{ rotulo: "Ver agenda", href: "/agenda" }}
      />
    );
  }

  return (
    <>
      <p className="dashboard-proximas-intro">
        Agrupadas por dia — o dia de hoje está na agenda acima.
      </p>

      <div className="dashboard-proximas-grupos">
        {grupos.map((grupo) => (
          <GrupoDia
            key={grupo.dataIso}
            grupo={grupo}
            onAbrir={(id) => router.push(`/sessao/${id}`)}
          />
        ))}
      </div>

      <p className="dashboard-proximas-link">
        <Link className="btn btn-outline" href="/agenda">
          Ver agenda completa
        </Link>
      </p>
    </>
  );
}

function GrupoDia({
  grupo,
  onAbrir,
}: {
  grupo: GrupoProximasSessoes;
  onAbrir: (id: Sessao["id"]) => void;
}) {
  const total = grupo.sessoes.length;

  return (
    <section
      className="dashboard-proximas-grupo"
      aria-label={`${grupo.titulo}, ${total} ${total === 1 ? "sessão" : "sessões"}`}
    >
      <header className="dashboard-proximas-grupo-header">
        <div className="dashboard-proximas-grupo-heading">
          <strong>{grupo.titulo}</strong>
          {grupo.subtitulo ? <span>{grupo.subtitulo}</span> : null}
        </div>
        <span className="dashboard-proximas-grupo-count">
          {total} {total === 1 ? "sessão" : "sessões"}
        </span>
      </header>

      <div className="dashboard-proximas-grupo-list">
        {grupo.sessoes.map((sessao) => (
          <div key={sessao.id} className="dashboard-proximas-row">
            <div className="dashboard-proximas-row-time">
              <strong>{formatarHorario(sessao.hora)}</strong>
            </div>

            <div className="dashboard-proximas-row-info">
              <strong>{sessao.paciente_nome || "Paciente"}</strong>
              <span className="dashboard-proximas-row-status">
                {sessao.status || "Agendada"}
              </span>
            </div>

            <div className="dashboard-proximas-row-meta">
              {formatarMoeda(Number(sessao.valor || 0))}
            </div>

            <button
              type="button"
              className="btn btn-outline dashboard-proximas-row-action"
              onClick={() => onAbrir(sessao.id)}
            >
              Abrir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
