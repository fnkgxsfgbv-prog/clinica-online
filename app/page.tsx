"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import DashboardPersonalizar, {
  DashboardBlocoAcoes,
} from "./components/DashboardPersonalizar";
import FlashMessage from "./components/FlashMessage";
import Janela from "./components/Janela";
import PendenciasClinica from "./components/PendenciasClinica";
import { usePreferencias } from "./components/PreferenciasProvider";
import {
  agruparBlocosDashboard,
  grupoPodeDescer,
  grupoPodeSubir,
  idsDoGrupoDashboard,
  moverGrupoDashboard,
  ordemPadraoDashboard,
  type DashboardBlocoId,
  type DashboardGrupoRender,
} from "./lib/dashboard-blocos";
import { montarChecklistUnificado } from "./lib/checklist-clinica";
import { pacienteEstaAtivo } from "./lib/status-paciente";
import { useDashboardLayout } from "./lib/use-dashboard-layout";
import { DashboardSkeleton } from "./components/ui/Skeleton";
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
  const { preferencias, atualizarPreferencias } = usePreferencias();
  const { blocosOcultos, blocosOrdem, salvarLayout } = useDashboardLayout(
    preferencias,
    atualizarPreferencias
  );
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
  const [editandoDashboard, setEditandoDashboard] = useState(false);

  function ocultarBloco(id: DashboardBlocoId) {
    salvarLayout((atual) => {
      const ids = idsDoGrupoDashboard(
        atual.dashboardBlocosOrdem,
        atual.dashboardBlocosOcultos,
        id
      );
      const novos = [...atual.dashboardBlocosOcultos];
      for (const item of ids) {
        if (!novos.includes(item)) novos.push(item);
      }
      return { dashboardBlocosOcultos: novos };
    });
  }

  function mostrarBloco(id: DashboardBlocoId) {
    salvarLayout((atual) => ({
      dashboardBlocosOcultos: atual.dashboardBlocosOcultos.filter(
        (item) => item !== id
      ),
    }));
  }

  function restaurarPadraoDashboard() {
    salvarLayout({
      dashboardBlocosOcultos: [],
      dashboardBlocosOrdem: ordemPadraoDashboard(),
    });
  }

  function moverBloco(id: DashboardBlocoId, direcao: "up" | "down") {
    salvarLayout((atual) => ({
      dashboardBlocosOrdem: moverGrupoDashboard(
        atual.dashboardBlocosOrdem,
        atual.dashboardBlocosOcultos,
        id,
        direcao
      ),
    }));
  }

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
  const pacientesAtivos = pacientes.filter((p) =>
    pacienteEstaAtivo(p.status)
  ).length;
  const sessoesHoje = sessoesHojeLista;
  const presencas = comparecimentoMes.presencas;
  const faltas = comparecimentoMes.faltas;
  const receitaPrevista = sessoes.reduce(
    (total, sessao) => total + Number(sessao.valor || 0),
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

  const gruposDashboard = useMemo(
    () => agruparBlocosDashboard(blocosOrdem, blocosOcultos),
    [blocosOrdem, blocosOcultos]
  );

  function acoesBloco(id: DashboardBlocoId) {
    const label = id.startsWith("metric-")
      ? "Indicadores"
      : undefined;

    return (
      <DashboardBlocoAcoes
        id={id}
        label={label}
        editando={editandoDashboard}
        podeSubir={grupoPodeSubir(blocosOrdem, blocosOcultos, id)}
        podeDescer={grupoPodeDescer(blocosOrdem, blocosOcultos, id)}
        onOcultar={ocultarBloco}
        onMoverCima={(blocoId) => moverBloco(blocoId, "up")}
        onMoverBaixo={(blocoId) => moverBloco(blocoId, "down")}
      />
    );
  }

  function renderMetric(id: DashboardBlocoId) {
    switch (id) {
      case "metric-pacientes":
        return (
          <DashboardMetric
            label="Pacientes ativos"
            value={pacientesAtivos}
            detail={`${pacientes.length} cadastrados`}
            variant="patients"
          />
        );
      case "metric-sessoes":
        return (
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
        );
      case "metric-comparecimento":
        return (
          <DashboardMetric
            label="Comparecimento"
            value={`${taxaComparecimento}%`}
            detail={`${presencas} presenças / ${faltas} faltas no mês`}
            variant="attendance"
          />
        );
      case "metric-receita":
        return (
          <DashboardMetric
            label="Receita próximas"
            value={formatarMoeda(receitaPrevista)}
            detail={`${sessoes.length} sessões agendadas`}
            variant="revenue"
          />
        );
      default:
        return null;
    }
  }

  function renderBloco(id: DashboardBlocoId) {
    switch (id) {
      case "agenda-hoje":
        return <DashboardAgendaHoje dataIso={hoje} sessoes={sessoesHojeLista} />;
      case "pendencias":
        return (
          <PendenciasClinica
            itens={montarChecklistUnificado(pacientes, sessoes, frequencias)}
            titulo="Pendências da clínica"
          />
        );
      case "proximas-sessoes":
        return (
          <section className="dashboard-secao">
            <h2 className="dashboard-secao-titulo">Próximas sessões</h2>
            <DashboardProximasSessoes hojeIso={hoje} sessoes={sessoes} />
          </section>
        );
      case "aniversariantes":
        return (
          <section className="dashboard-secao">
            <h2 className="dashboard-secao-titulo">
              Aniversariantes de {mesAtual}
            </h2>
            <BirthdayReminder aniversariantes={aniversariantesMes} />
          </section>
        );
      default:
        return renderMetric(id);
    }
  }

  function renderGrupo(grupo: DashboardGrupoRender, index: number) {
    if (grupo.tipo === "metrics") {
      const idReferencia = grupo.ids[0];
      return (
        <div
          key={`metrics-${grupo.ids.join("-")}-${index}`}
          className="dashboard-bloco-wrap"
        >
          {acoesBloco(idReferencia)}
          <div className="dashboard-metrics-grid">
            {grupo.ids.map((id) => (
              <div key={id} className="dashboard-metric-wrap">
                {renderBloco(id)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={grupo.id} className="dashboard-bloco-wrap">
        {acoesBloco(grupo.id)}
        {renderBloco(grupo.id)}
      </div>
    );
  }

  const nenhumBlocoVisivel = gruposDashboard.length === 0;

  return (
    <div className="dashboard-page">
      <Janela
        titulo="Dashboard"
        acoes={
          <DashboardPersonalizar
            compacto
            editando={editandoDashboard}
            blocosOcultos={blocosOcultos}
            onToggleEditando={() => setEditandoDashboard((atual) => !atual)}
            onMostrar={mostrarBloco}
            onRestaurarPadrao={restaurarPadraoDashboard}
          />
        }
      >
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

        {editandoDashboard ? (
          <DashboardPersonalizar
            editando={editandoDashboard}
            blocosOcultos={blocosOcultos}
            onToggleEditando={() => setEditandoDashboard((atual) => !atual)}
            onMostrar={mostrarBloco}
            onRestaurarPadrao={restaurarPadraoDashboard}
          />
        ) : null}

        {carregando ? (
          <DashboardSkeleton />
        ) : (
          <>
            <p className="dashboard-subtitle">
              Visão geral da clínica
              {editandoDashboard ? (
                <span className="dashboard-editando-hint">
                  {" "}
                  — use ↑ ↓ para reordenar e &quot;Ocultar&quot; para remover
                  blocos.
                </span>
              ) : null}
            </p>

            <div
              className={`dashboard-blocos-stack${
                editandoDashboard ? " is-editing" : ""
              }`}
            >
              {gruposDashboard.map((grupo, index) => renderGrupo(grupo, index))}

              {nenhumBlocoVisivel ? (
                <div className="dashboard-vazio-edicao">
                  <p>Todos os blocos estão ocultos.</p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={restaurarPadraoDashboard}
                  >
                    Restaurar layout padrão
                  </button>
                </div>
              ) : null}
            </div>
          </>
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

      <strong className="dashboard-metric-value">{value}</strong>

      <p>{detail}</p>
    </div>
  );
}
