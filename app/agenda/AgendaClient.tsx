"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import type { EventProps, ToolbarProps, View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pt-br.js";
import "react-big-calendar/lib/css/react-big-calendar.css";
import ConfirmacaoModal from "../components/ConfirmacaoModal";
import FlashMessage from "../components/FlashMessage";
import { getCurrentUser } from "../lib/auth";
import {
  excluirSessaoCompleta,
  sessoesMesmoPacienteNoDia,
} from "../lib/db/excluir-sessao";
import { salvarFrequenciaDaSessao } from "../lib/db/frequencia";
import {
  filtrarSessoesExcluidasLocalmente,
  idsSessoesExcluidasLocalmente,
  limparSessaoExcluidaLocal,
  marcarSessoesExcluidasLocal,
} from "../lib/agenda-sessoes-excluidas";
import {
  criarDataHoraSessao,
  mesmaDataAgenda,
  sessaoPassaFiltroAgenda,
} from "../lib/agenda-sessao";
import { dataReferenciaISO } from "../lib/financeiro";
import {
  rotuloStatusFrequencia,
  visualFrequenciaAgenda,
} from "../lib/status";
import { listEvolucoesPorSessoes } from "../lib/db/evolucoes";
import { listPacientes } from "../lib/db/pacientes";
import {
  insertSessoes,
  listSessoes,
  updateSessao,
} from "../lib/db/sessoes";
import { requireUserClient } from "../lib/require-user-client";
import { mensagemErroSupabase } from "../lib/supabase-error";
import type { Evolucao, Paciente, Sessao } from "../types";

moment.locale("pt-br");

const localizer = momentLocalizer(moment);

type TipoRecorrencia = "quantidade" | "indeterminado";

type AgendaEvent = {
  id: Sessao["id"];
  title: string;
  start: Date;
  end: Date;
  resource: Sessao;
  eventosAgrupados?: AgendaEvent[];
  grupoHorario?: {
    total: number;
    posicao: number;
  };
};

type AgendaModo = "geral" | "dia";

type AgendaLayoutArgs = {
  events: AgendaEvent[];
  accessors: {
    start: (event: AgendaEvent) => Date;
    end: (event: AgendaEvent) => Date;
  };
  slotMetrics: {
    getRange: (
      start: Date,
      end: Date
    ) => {
      top: number;
      height: number;
    };
  };
};

type SessaoParaCriar = {
  user_id: string;
  paciente_id: Paciente["id"];
  paciente_nome: string;
  data: string;
  hora: string;
  valor: number;
  status: "Agendada";
};

export default function AgendaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const simularGrupo = searchParams.get("simulacao-grupo") === "1";
  const [dataAtual, setDataAtual] = useState(new Date());
  const [visualizacao, setVisualizacao] = useState<View>(Views.WEEK);
  const [modoAgenda, setModoAgenda] = useState<AgendaModo>("geral");
  const [situacaoFiltro, setSituacaoFiltro] = useState("todos");

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [preSessoes, setPreSessoes] = useState<Record<string, string>>({});
  const [menuFrequenciaAberto, setMenuFrequenciaAberto] = useState("");
  const [exclusaoSessaoPendente, setExclusaoSessaoPendente] =
    useState<Sessao | null>(null);
  const [excluirTodasSessoesDoPacienteNoDia, setExcluirTodasSessoesDoPacienteNoDia] =
    useState(false);
  const [excluindoSessao, setExcluindoSessao] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const [abrirForm, setAbrirForm] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [valor, setValor] = useState("");

  const [repetir, setRepetir] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] =
    useState<TipoRecorrencia>("quantidade");
  const [quantidadeSemanas, setQuantidadeSemanas] =
    useState("4");

  const carregarDados = useCallback(async () => {
    setErro("");
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { data: pacientesData, error: pacientesError } =
      await listPacientes(user.id);

    if (pacientesError) {
      setErro(
        "Erro ao carregar pacientes: " + pacientesError.message
      );
      return;
    }

    const { data: sessoesDataInicial, error: sessoesError } = await listSessoes(
      user.id
    );

    if (sessoesError) {
      setErro(
        "Erro ao carregar sessões: " + sessoesError.message
      );
      return;
    }

    let sessoesData = sessoesDataInicial;

    const pendentes = (sessoesData || []).filter((s) =>
      idsSessoesExcluidasLocalmente(user.id).has(String(s.id))
    );

    if (pendentes.length > 0) {
      for (const s of pendentes) {
        if (s.id == null) continue;
        const resultado = await excluirSessaoCompleta(user.id, s.id);
        if (resultado.ok) limparSessaoExcluidaLocal(user.id, s.id);
      }
      const recarga = await listSessoes(user.id);
      if (!recarga.error) sessoesData = recarga.data;
    }

    setPacientes((pacientesData || []) as Paciente[]);
    setSessoes(
      filtrarSessoesExcluidasLocalmente(
        user.id,
        (sessoesData || []) as Sessao[]
      )
    );
    setPreSessoes({});
  }, [router]);

  const carregarPreSessoesDoDia = useCallback(async () => {
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const iso = formatarDataISO(dataAtual);
    const ids = sessoes
      .filter((s) => mesmaDataAgenda(s.data, iso))
      .map((s) => s.id);

    if (ids.length === 0) {
      setPreSessoes({});
      return;
    }

    const { data: evolucoesData, error: evolucoesError } =
      await listEvolucoesPorSessoes(user.id, ids);

    if (evolucoesError) {
      setPreSessoes({});
      return;
    }

    setPreSessoes(mapearPreSessoes((evolucoesData || []) as Evolucao[]));
  }, [router, dataAtual, sessoes]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (modoAgenda !== "dia") return;
    void carregarPreSessoesDoDia();
  }, [modoAgenda, carregarPreSessoesDoDia]);

  useEffect(() => {
    if (!menuFrequenciaAberto) return;

    function fecharMenuAoClicarFora(event: MouseEvent) {
      const alvo = event.target;
      if (!(alvo instanceof Element)) return;
      if (alvo.closest(".agenda-day-frequency")) return;
      setMenuFrequenciaAberto("");
    }

    function fecharMenuComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuFrequenciaAberto("");
    }

    document.addEventListener("mousedown", fecharMenuAoClicarFora);
    document.addEventListener("keydown", fecharMenuComEscape);

    return () => {
      document.removeEventListener("mousedown", fecharMenuAoClicarFora);
      document.removeEventListener("keydown", fecharMenuComEscape);
    };
  }, [menuFrequenciaAberto]);

  function criarDataHora(dataSessao: string, horaSessao: string) {
    return criarDataHoraSessao(dataSessao, horaSessao) ?? new Date();
  }

  function formatarDataISO(dataObj: Date) {
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
    const dia = String(dataObj.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  const eventosBanco: AgendaEvent[] = sessoes.flatMap((sessao) => {
    if (!sessaoPassaFiltroAgenda(sessao.status, situacaoFiltro)) {
      return [];
    }

    const inicio = criarDataHoraSessao(sessao.data, sessao.hora || "08:00");
    if (!inicio) return [];

    const fim = new Date(inicio);
    fim.setHours(fim.getHours() + 1);

    return [
      {
        id: sessao.id,
        title: sessao.paciente_nome || "Paciente",
        start: inicio,
        end: fim,
        resource: sessao,
      },
    ];
  });
  const eventosSimulacao: AgendaEvent[] =
    simularGrupo && ["todos", "agendada"].includes(situacaoFiltro)
      ? criarEventosSimulacaoGrupo(criarDataHora)
      : [];
  const eventos = agruparEventosParaCalendario([
    ...eventosBanco,
    ...eventosSimulacao,
  ]);

  const dataAtualISO = formatarDataISO(dataAtual);
  const sessoesDoDia = sessoes
    .filter((sessao) => {
      if (!mesmaDataAgenda(sessao.data, dataAtualISO)) return false;
      return sessaoPassaFiltroAgenda(sessao.status, situacaoFiltro);
    })
    .sort((a, b) => criarDataHora(a.data, a.hora || "08:00").getTime() - criarDataHora(b.data, b.hora || "08:00").getTime());
  const diasDoMes = Array.from(
    {
      length: new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth() + 1,
        0
      ).getDate(),
    },
    (_, index) => new Date(dataAtual.getFullYear(), dataAtual.getMonth(), index + 1)
  );
  const diasComSessao = new Set(
    sessoes
      .map((s) => dataReferenciaISO(s.data))
      .filter((d): d is string => Boolean(d))
  );

  const sessoesVisiveisNoCalendario = eventosBanco.length;
  const sessoesComDataInvalida =
    sessoes.filter(
      (s) =>
        sessaoPassaFiltroAgenda(s.status, situacaoFiltro) &&
        !dataReferenciaISO(s.data)
    ).length;

  async function agendarSessao() {
    setErro("");
    if (!pacienteId || !data || !hora) {
      setErro("Preencha paciente, data e horário.");
      return;
    }

    const paciente = pacientes.find(
      (p) => String(p.id) === String(pacienteId)
    );

    if (!paciente) {
      setErro("Paciente não encontrado.");
      return;
    }

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const semanas = repetir
      ? tipoRecorrencia === "indeterminado"
        ? 26
        : Math.max(1, Number(quantidadeSemanas || 1))
      : 1;

    const sessoesParaCriar: SessaoParaCriar[] = [];

    for (let i = 0; i < semanas; i++) {
      const dataBase = criarDataHora(data, hora);

      dataBase.setDate(dataBase.getDate() + i * 7);

      sessoesParaCriar.push({
        user_id: user.id,
        paciente_id: paciente.id,
        paciente_nome: paciente.nome,
        data: formatarDataISO(dataBase),
        hora,
        valor: Number(valor || paciente.valor_sessao || 0),
        status: "Agendada",
      });
    }

    const { error } = await insertSessoes(sessoesParaCriar);

    if (error) {
      setErro(mensagemErroSupabase("salvar sessão", error));
      return;
    }

    setErro("");
    setMensagem(
      repetir
        ? `${semanas} sessões agendadas com sucesso.`
        : "Sessão agendada com sucesso."
    );
    setAbrirForm(false);
    setPacienteId("");
    setData("");
    setHora("");
    setValor("");
    setRepetir(false);
    setTipoRecorrencia("quantidade");
    setQuantidadeSemanas("4");

    void carregarDados();
  }

  function clicarEvento(evento: AgendaEvent) {
    if (evento.eventosAgrupados?.length) {
      setDataAtual(evento.start);
      setModoAgenda("dia");
      setMensagem(
        `${evento.eventosAgrupados.length} sessões neste mesmo horário.`
      );
      return;
    }

    if (String(evento.id).startsWith("simulacao-grupo-")) {
      setMensagem("Este é um exemplo visual. Nenhum dado foi salvo.");
      return;
    }

    router.push(`/sessao/${evento.id}`);
  }

  async function atualizarStatusPeloDia(sessao: Sessao, novoStatus: string) {
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await updateSessao(user.id, sessao.id, {
      status: novoStatus,
    });

    if (error) {
      setErro(mensagemErroSupabase("atualizar sessão", error));
      return;
    }

    const statusGravado =
      rotuloStatusFrequencia(novoStatus) ?? novoStatus;

    const { error: frequenciaError } = await salvarFrequenciaDaSessao(
      user.id,
      sessao,
      novoStatus
    );

    if (frequenciaError) {
      setErro(
        mensagemErroSupabase("atualizar frequência", frequenciaError)
      );
      return;
    }

    setSessoes((atuais) =>
      atuais.map((item) =>
        String(item.id) === String(sessao.id)
          ? { ...item, status: statusGravado }
          : item
      )
    );
    setMenuFrequenciaAberto("");
    setMensagem(`Sessão marcada como ${novoStatus}.`);
  }

  function sessoesFiltradasDoDiaAtual() {
    const dataIso = formatarDataISO(dataAtual);
    return sessoes.filter((s) => {
      if (!mesmaDataAgenda(s.data, dataIso)) return false;
      return sessaoPassaFiltroAgenda(s.status, situacaoFiltro);
    });
  }

  function solicitarExclusaoSessaoDoDia(sessao: Sessao) {
    setErro("");
    setMensagem("");
    setMenuFrequenciaAberto("");
    const dataIso = formatarDataISO(dataAtual);
    const irmaas = sessoesMesmoPacienteNoDia(
      sessao,
      sessoesFiltradasDoDiaAtual(),
      dataIso
    );
    setExcluirTodasSessoesDoPacienteNoDia(irmaas.length > 1);
    setExclusaoSessaoPendente(sessao);
  }

  async function confirmarExclusaoSessaoDoDia() {
    const sessao = exclusaoSessaoPendente;
    if (!sessao?.id) return;

    setExcluindoSessao(true);
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setExcluindoSessao(false);
      return;
    }

    const dataIso = formatarDataISO(dataAtual);
    const alvos = excluirTodasSessoesDoPacienteNoDia
      ? sessoesMesmoPacienteNoDia(
          sessao,
          sessoesFiltradasDoDiaAtual(),
          dataIso
        )
      : [sessao];

    const idsExcluidos = new Set<string>();

    for (const alvo of alvos) {
      if (alvo.id == null) continue;
      const resultado = await excluirSessaoCompleta(user.id, alvo.id);
      if (!resultado.ok) {
        const idsOcultar = alvos
          .map((a) => a.id)
          .filter((id): id is string | number => id != null);
        marcarSessoesExcluidasLocal(user.id, idsOcultar);
        setExclusaoSessaoPendente(null);
        setExcluirTodasSessoesDoPacienteNoDia(false);
        setSessoes((atuais) =>
          filtrarSessoesExcluidasLocalmente(user.id, atuais)
        );
        setErro(
          `${resultado.error.message} A sessão foi ocultada neste aparelho; ao recarregar tentaremos excluir de novo.`
        );
        setExcluindoSessao(false);
        return;
      }
      limparSessaoExcluidaLocal(user.id, alvo.id);
      idsExcluidos.add(String(alvo.id));
    }

    setExclusaoSessaoPendente(null);
    setExcluirTodasSessoesDoPacienteNoDia(false);
    setSessoes((atuais) =>
      atuais.filter((item) => !idsExcluidos.has(String(item.id)))
    );
    setPreSessoes((atuais) => {
      const proximas = { ...atuais };
      for (const id of idsExcluidos) delete proximas[id];
      return proximas;
    });

    if (alvos.length > 1) {
      setMensagem(
        `${alvos.length} sessões de ${sessao.paciente_nome || "Paciente"} excluídas deste dia.`
      );
    } else {
      setMensagem(
        `Sessão de ${sessao.paciente_nome || "Paciente"} às ${formatarHorario(sessao.hora)} excluída.`
      );
    }
    setExcluindoSessao(false);
  }

  function nomeDiaSemana(dataBase: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dataBase);
  }

  function EventoPersonalizado({
    event,
  }: EventProps<AgendaEvent>) {
    const frequencia = visualFrequenciaAgenda(event.resource.status);
    const eventosDoGrupo = event.eventosAgrupados || [event];
    const grupoTotal = eventosDoGrupo.length;
    const eventoPrincipal = eventosDoGrupo[0] || event;

    return (
      <div
        className="agenda-event-content"
        title={`${event.title} - ${event.resource.hora || ""}`}
      >
        <span className="agenda-event-dot" />
        <span className="agenda-event-main">
          <span className="agenda-event-name">
            {grupoTotal > 1 ? `${grupoTotal} sessões` : event.title}
          </span>
          <span className="agenda-event-meta">
            {eventoPrincipal.resource.hora || ""}
            {grupoTotal > 1 ? " · mesmo horário" : ""}
          </span>
          {grupoTotal > 1 ? (
            <span className="agenda-event-group-list">
              {eventosDoGrupo
                .slice(0, 3)
                .map((item) => item.title.replace(/^Simulação - /, ""))
                .join(", ")}
              {grupoTotal > 3 ? ` +${grupoTotal - 3}` : ""}
            </span>
          ) : null}
        </span>
        {grupoTotal > 1 ? null : (
          <span
            className="agenda-event-status"
            aria-label={frequencia.rotulo}
            title={frequencia.rotulo}
          >
            {frequencia.icone}
          </span>
        )}
      </div>
    );
  }

  function rotuloIntervaloAgenda(dataBase: Date, view: View) {
    if (view === Views.DAY) {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(dataBase);
    }

    if (view === Views.MONTH) {
      return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(dataBase);
    }

    const inicio = moment(dataBase).startOf("week").add(1, "day");
    const fim = moment(inicio).add(4, "day");

    return `${inicio.format("DD")} – ${fim.format("DD [de] MMMM [de] YYYY")}`;
  }

  function AgendaToolbar(toolbar: ToolbarProps<AgendaEvent, object>) {
    return (
      <div className="psico-agenda-toolbar">
        <div className="agenda-toolbar-left">
          <select
            value={situacaoFiltro}
            onChange={(event) => setSituacaoFiltro(event.target.value)}
            aria-label="Status da sessão"
          >
            <option value="todos">Status: Todos</option>
            <option value="agendada">Status: Agendada</option>
            <option value="presente">Status: Presente</option>
            <option value="faltou">Status: Faltou</option>
            <option value="cancelada">Status: Cancelada</option>
          </select>
          <button type="button" onClick={() => toolbar.onNavigate("PREV")}>
            ‹
          </button>
          <button type="button" onClick={() => toolbar.onNavigate("NEXT")}>
            ›
          </button>
          <button type="button" onClick={() => toolbar.onNavigate("TODAY")}>
            Hoje
          </button>
        </div>

        <strong className="agenda-toolbar-label">
          {rotuloIntervaloAgenda(toolbar.date, toolbar.view)}
        </strong>

        <div className="agenda-toolbar-views">
          <button
            type="button"
            className={toolbar.view === Views.MONTH ? "is-active" : ""}
            onClick={() => toolbar.onView(Views.MONTH)}
          >
            Mês
          </button>
          <button
            type="button"
            className={toolbar.view === Views.WEEK ? "is-active" : ""}
            onClick={() => toolbar.onView(Views.WEEK)}
          >
            Semana
          </button>
          <button
            type="button"
            className={toolbar.view === Views.DAY ? "is-active" : ""}
            onClick={() => toolbar.onView(Views.DAY)}
          >
            Dia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="agenda-page-shell">
      <div className="agenda-hero-row">
        <div>
          <h1 className="agenda-title">
            Agenda
          </h1>

          <p className="agenda-description">
            Organize sessões e atendimentos
          </p>
        </div>

        <button
          type="button"
          className="btn btn-green"
          onClick={() => setAbrirForm((aberto) => !aberto)}
        >
          {abrirForm ? "Fechar agendamento" : "+ Agendar sessão"}
        </button>
      </div>

      <div className="agenda-mode-tabs">
        <button
          type="button"
          className={modoAgenda === "geral" ? "is-active" : ""}
          onClick={() => setModoAgenda("geral")}
        >
          Agenda geral
        </button>
        <button
          type="button"
          className={modoAgenda === "dia" ? "is-active" : ""}
          onClick={() => setModoAgenda("dia")}
        >
          Sessões por dia
        </button>
      </div>

      <div className="agenda-status-legend" aria-label="Legenda de cores">
        <span>
          <i className="agenda-legend-swatch agenda-status-agendada" /> Agendada
        </span>
        <span>
          <i className="agenda-legend-swatch agenda-status-presente" /> Presente
        </span>
        <span>
          <i className="agenda-legend-swatch agenda-status-faltou" /> Faltou
        </span>
        <span>
          <i className="agenda-legend-swatch agenda-status-cancelada" /> Cancelada
        </span>
      </div>

      {abrirForm && (
        <div className="agenda-schedule-form">
          <select
            value={pacienteId}
            onChange={(e) => {
              const id = e.target.value;
              const paciente = pacientes.find(
                (p) => String(p.id) === String(id)
              );

              setPacienteId(id);
              setValor(
                paciente?.valor_sessao
                  ? String(paciente.valor_sessao)
                  : ""
              );
            }}
          >
            <option value="">Selecione o paciente</option>

            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />

          <input
            placeholder="Valor"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />

          <button
            type="button"
            className="btn btn-green"
            onClick={agendarSessao}
          >
            Salvar
          </button>

          <div className="agenda-recurrence-row">
            <label className="agenda-recurrence-check">
              <input
                type="checkbox"
                checked={repetir}
                onChange={(e) => setRepetir(e.target.checked)}
              />
              Repetir semanalmente
            </label>

            {repetir && (
              <>
                <select
                  value={tipoRecorrencia}
                  onChange={(e) =>
                    setTipoRecorrencia(
                      e.target.value as TipoRecorrencia
                    )
                  }
                >
                  <option value="quantidade">
                    Por quantidade de semanas
                  </option>
                  <option value="indeterminado">
                    Tempo indeterminado - 6 meses
                  </option>
                </select>

                {tipoRecorrencia === "quantidade" && (
                  <input
                    type="number"
                    min="1"
                    max="52"
                    placeholder="Semanas"
                    value={quantidadeSemanas}
                    onChange={(e) =>
                      setQuantidadeSemanas(e.target.value)
                    }
                  />
                )}
              </>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setAbrirForm(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

      {mensagem ? (
        <FlashMessage kind="success">{mensagem}</FlashMessage>
      ) : null}

      {simularGrupo ? (
        <FlashMessage kind="success">
          Simulação visual ativa: pacientes fictícios no mesmo horário.
        </FlashMessage>
      ) : null}

      {sessoes.length > 0 &&
      sessoesVisiveisNoCalendario === 0 &&
      modoAgenda === "geral" ? (
        <FlashMessage kind="error">
          {sessoesComDataInvalida > 0
            ? `${sessoesComDataInvalida} sessão(ões) com data inválida no cadastro. Confira o formato da data no banco.`
            : `Há ${sessoes.length} sessão(ões) no sistema, mas nenhuma aparece com o filtro "${situacaoFiltro}". Tente "Status: Todos" ou outro filtro.`}
        </FlashMessage>
      ) : null}

      {modoAgenda === "dia" ? (
        <div className="agenda-day-workspace">
          <aside className="agenda-mini-calendar">
            <div className="agenda-mini-header">
              <strong>Calendário</strong>
              <span>
                {new Intl.DateTimeFormat("pt-BR", {
                  month: "long",
                  year: "numeric",
                }).format(dataAtual)}
              </span>
            </div>

            <div className="agenda-mini-days">
              {diasDoMes.map((dia) => {
                const iso = formatarDataISO(dia);
                const selecionado = iso === dataAtualISO;

                return (
                  <button
                    key={iso}
                    type="button"
                    className={`${selecionado ? "is-selected" : ""} ${
                      diasComSessao.has(iso) ? "has-session" : ""
                    }`}
                    onClick={() => setDataAtual(dia)}
                  >
                    {dia.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="agenda-mini-legend">
              <span><i /> Sessões agendadas</span>
              <span><i className="muted" /> Dia selecionado</span>
            </div>
          </aside>

          <section className="agenda-day-panel">
            <div className="agenda-day-header">
              <div>
                <strong>Sessões do dia</strong>
                <span>{nomeDiaSemana(dataAtual)}</span>
              </div>
              <select
                value={situacaoFiltro}
                onChange={(event) => setSituacaoFiltro(event.target.value)}
                aria-label="Status da sessão"
              >
                <option value="todos">Status: Todos</option>
                <option value="agendada">Status: Agendada</option>
                <option value="presente">Status: Presente</option>
                <option value="faltou">Status: Faltou</option>
                <option value="cancelada">Status: Cancelada</option>
              </select>
            </div>

            {sessoesDoDia.length === 0 ? (
              <div className="agenda-day-empty">
                Nenhuma sessão agendada para este dia.
              </div>
            ) : (
              <div className="agenda-day-table">
                <div className="agenda-day-row agenda-day-head">
                  <span>Cliente</span>
                  <span>Hora</span>
                  <span>Valor</span>
                  <span>Frequência</span>
                  <span>Pré-sessão</span>
                  <span>Ações</span>
                </div>
                {sessoesDoDia.map((sessao) => {
                  const frequencia = visualFrequenciaAgenda(sessao.status);

                  return (
                  <div key={sessao.id} className="agenda-day-row">
                    <span className="agenda-day-client">
                      <i>{(sessao.paciente_nome || "Paciente").slice(0, 2).toUpperCase()}</i>
                      {sessao.paciente_nome || "Paciente"}
                    </span>
                    <span>{formatarHorario(sessao.hora)}</span>
                    <span>{formatarValor(sessao.valor)}</span>
                    <span className="agenda-day-frequency">
                      <button
                        type="button"
                        className={`agenda-presence-button ${frequencia.classe}`}
                        onClick={() =>
                          setMenuFrequenciaAberto((atual) =>
                            atual === String(sessao.id) ? "" : String(sessao.id)
                          )
                        }
                        aria-label={`Alterar frequência: ${frequencia.rotulo}`}
                        title={frequencia.rotulo}
                      >
                        <span>{frequencia.icone}</span>
                        <small>⌄</small>
                      </button>
                      {menuFrequenciaAberto === String(sessao.id) ? (
                        <div className="agenda-frequency-menu">
                          <button
                            type="button"
                            className="is-present"
                            onClick={() => void atualizarStatusPeloDia(sessao, "Presente")}
                          >
                            <span>👍</span> Paciente presente
                          </button>
                          <button
                            type="button"
                            className="is-absent"
                            onClick={() => void atualizarStatusPeloDia(sessao, "Faltou")}
                          >
                            <span>👎</span> Paciente ausente
                          </button>
                          <button
                            type="button"
                            className="is-cancel"
                            onClick={() => void atualizarStatusPeloDia(sessao, "Cancelada")}
                          >
                            <span>🚫</span> Paciente cancelou
                          </button>
                          <button
                            type="button"
                            className="is-cancel"
                            onClick={() => void atualizarStatusPeloDia(sessao, "Cancelada")}
                          >
                            <span>⛔</span> Profissional cancelou
                          </button>
                          <button
                            type="button"
                            className="is-confirm"
                            onClick={() => void atualizarStatusPeloDia(sessao, "Agendada")}
                          >
                            <span>✓</span> Confirmar agendamento
                          </button>
                          <button
                            type="button"
                            className="is-undo"
                            onClick={() => void atualizarStatusPeloDia(sessao, "Agendada")}
                          >
                            <span>✕</span> Desfazer
                          </button>
                        </div>
                      ) : null}
                    </span>
                    <span className="agenda-day-pre-session">
                      {preSessoes[String(sessao.id)] || "-"}
                    </span>
                    <span className="agenda-day-actions">
                      <Link
                        href={`/sessao/${sessao.id}?modo=anotacoes`}
                        className="agenda-day-action agenda-day-action--note"
                        title={`Anotar sessão de ${sessao.paciente_nome || "Paciente"}`}
                        aria-label={`Anotar sessão de ${sessao.paciente_nome || "Paciente"}`}
                      >
                        Anotar
                      </Link>
                      <button
                        type="button"
                        className="agenda-day-action agenda-day-action--delete"
                        title={`Excluir sessão de ${sessao.paciente_nome || "Paciente"}`}
                        aria-label={`Excluir sessão de ${sessao.paciente_nome || "Paciente"} às ${formatarHorario(sessao.hora)}`}
                        disabled={
                          excluindoSessao &&
                          exclusaoSessaoPendente != null &&
                          String(exclusaoSessaoPendente.id) === String(sessao.id)
                        }
                        onClick={() => solicitarExclusaoSessaoDoDia(sessao)}
                      >
                        Excluir
                      </button>
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="agenda-calendar-frame">
          <Calendar<AgendaEvent>
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            date={dataAtual}
            view={visualizacao}
            onNavigate={(novaData) => setDataAtual(novaData)}
            onView={(novaVisualizacao) =>
              setVisualizacao(novaVisualizacao)
            }
            onSelectEvent={clicarEvento}
            defaultView={Views.WEEK}
            views={[Views.DAY, Views.WEEK, Views.MONTH]}
            min={new Date(2026, 0, 1, 7, 0)}
            max={new Date(2026, 0, 1, 22, 0)}
            dayLayoutAlgorithm={organizarEventosDaAgenda}
            components={{
              event: EventoPersonalizado,
              toolbar: AgendaToolbar,
            }}
            eventPropGetter={(event) => {
              const visual = visualFrequenciaAgenda(event.resource.status);
              return {
                className: `agenda-session-event ${visual.classeCalendario}${
                  event.eventosAgrupados?.length
                    ? " agenda-event-grouped agenda-event-group-card"
                    : ""
                }`,
                style: {
                  whiteSpace: "normal",
                },
              };
            }}
            messages={{
              today: "Hoje",
              previous: "Voltar",
              next: "Próximo",
              month: "Mês",
              week: "Semana",
              day: "Dia",
              agenda: "Agenda",
              date: "Data",
              time: "Hora",
              event: "Sessão",
              noEventsInRange: "Nenhuma sessão nesse período",
            }}
            style={{
              height: "100%",
            }}
          />
        </div>
      )}

      <ConfirmacaoModal
        aberto={exclusaoSessaoPendente != null}
        titulo="Excluir sessão"
        perigo
        confirmando={excluindoSessao}
        rotuloConfirmar="Excluir"
        onCancelar={() => {
          if (!excluindoSessao) {
            setExclusaoSessaoPendente(null);
            setExcluirTodasSessoesDoPacienteNoDia(false);
          }
        }}
        onConfirmar={() => void confirmarExclusaoSessaoDoDia()}
      >
        <p>
          Tem certeza que deseja excluir a sessão de{" "}
          <strong>
            {exclusaoSessaoPendente?.paciente_nome || "Paciente"}
          </strong>{" "}
          às {formatarHorario(exclusaoSessaoPendente?.hora)}?
        </p>
        {exclusaoSessaoPendente &&
        sessoesMesmoPacienteNoDia(
          exclusaoSessaoPendente,
          sessoesDoDia,
          dataAtualISO
        ).length > 1 ? (
          <>
            <p className="confirmacao-aviso">
              Este paciente tem{" "}
              {
                sessoesMesmoPacienteNoDia(
                  exclusaoSessaoPendente,
                  sessoesDoDia,
                  dataAtualISO
                ).length
              }{" "}
              sessões hoje (
              {sessoesMesmoPacienteNoDia(
                exclusaoSessaoPendente,
                sessoesDoDia,
                dataAtualISO
              )
                .map((s) => formatarHorario(s.hora))
                .join(", ")}
              ).
            </p>
            <label className="confirmacao-checkbox">
              <input
                type="checkbox"
                checked={excluirTodasSessoesDoPacienteNoDia}
                disabled={excluindoSessao}
                onChange={(e) =>
                  setExcluirTodasSessoesDoPacienteNoDia(e.target.checked)
                }
              />
              <span>
                Excluir todas as sessões deste paciente hoje (recomendado se
                estiver duplicado)
              </span>
            </label>
          </>
        ) : null}
        <p className="confirmacao-aviso">
          Esta ação não pode ser desfeita. Anotações e frequência desta sessão
          também serão removidas.
        </p>
      </ConfirmacaoModal>
    </div>
  );
}

function formatarHorario(hora?: string | null) {
  return hora ? hora.slice(0, 5) : "--:--";
}

function formatarValor(valor?: string | number | null) {
  const numero = Number(valor || 0);
  if (!Number.isFinite(numero) || numero <= 0) return "-";
  return `R$ ${numero.toFixed(2).replace(".", ",")}`;
}

function chaveHorarioEvento(evento: AgendaEvent) {
  return [
    evento.start.getFullYear(),
    evento.start.getMonth(),
    evento.start.getDate(),
    evento.start.getHours(),
    evento.start.getMinutes(),
  ].join("-");
}

function agruparEventosParaCalendario(eventos: AgendaEvent[]) {
  const grupos = new Map<string, AgendaEvent[]>();

  eventos.forEach((evento) => {
    const chave = chaveHorarioEvento(evento);
    grupos.set(chave, [...(grupos.get(chave) || []), evento]);
  });

  return Array.from(grupos.values()).flatMap((grupo) => {
    if (grupo.length === 1) return grupo;

    const primeiro = grupo[0];

    return [
      {
        ...primeiro,
        id: `grupo-${chaveHorarioEvento(primeiro)}`,
        title: `${grupo.length} sessões`,
        eventosAgrupados: grupo,
        grupoHorario: {
          total: grupo.length,
          posicao: 1,
        },
      },
    ];
  });
}

function organizarEventosDaAgenda({
  events,
  accessors,
  slotMetrics,
}: AgendaLayoutArgs) {
  return events.map((event) => {
    const totalGrupo = event.grupoHorario?.total || 1;
    const posicaoGrupo = event.grupoHorario?.posicao || 1;
    const tamanhoGrupo = 100 / totalGrupo;
    const range = slotMetrics.getRange(accessors.start(event), accessors.end(event));
    const deslocamento = (posicaoGrupo - 1) * tamanhoGrupo;

    return {
      event,
      style: {
        top: range.top,
        height: `calc(${range.height}% - 2px)`,
        width: `calc(${tamanhoGrupo}% - ${totalGrupo > 1 ? 3 : 0}px)`,
        xOffset: `calc(${deslocamento}% + ${posicaoGrupo > 1 ? 3 : 0}px)`,
      },
    };
  });
}

function criarEventosSimulacaoGrupo(
  criarDataHora: (dataSessao: string, horaSessao: string) => Date
): AgendaEvent[] {
  const nomes = [
    "Simulação - Arthur Almeida",
    "Simulação - Pedro Antônio",
    "Simulação - Hadryan Castro",
    "Simulação - Flavia de Jesus",
  ];

  return nomes.map((nome, index) => {
    const inicio = criarDataHora("2026-05-21", "10:00");
    const fim = new Date(inicio);
    fim.setHours(fim.getHours() + 1);

    return {
      id: `simulacao-grupo-${index}`,
      title: nome,
      start: inicio,
      end: fim,
      resource: {
        id: `simulacao-grupo-${index}`,
        paciente_id: `simulacao-${index}`,
        paciente_nome: nome,
        data: "2026-05-21",
        hora: "10:00",
        valor: 0,
        status: "Agendada",
      },
    };
  });
}

function mapearPreSessoes(evolucoes: Evolucao[]) {
  return evolucoes.reduce<Record<string, string>>((acc, item) => {
    const sessaoId = item.sessao_id == null ? "" : String(item.sessao_id);
    if (!sessaoId) return acc;

    const resumo = textoResumoAgenda(item.objetivo || "");
    if (!resumo) return acc;

    if (item.status_sessao === "anotacoes_sessao") {
      acc[sessaoId] = resumo;
      return acc;
    }

    if (!acc[sessaoId]) {
      acc[sessaoId] = resumo;
    }

    return acc;
  }, {});
}

function textoResumoAgenda(valor: string) {
  const texto = valor.trim();
  if (!texto) return "";

  if (typeof document !== "undefined") {
    const elemento = document.createElement("div");
    elemento.innerHTML = texto;
    return (elemento.textContent || elemento.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return texto
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
