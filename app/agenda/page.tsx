"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import type { EventProps, View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pt-br.js";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { getCurrentUser } from "../lib/auth";
import { listPacientes } from "../lib/db/pacientes";
import { insertSessoes, listSessoes } from "../lib/db/sessoes";
import type { Paciente, Sessao } from "../types";

moment.locale("pt-br");

const localizer = momentLocalizer(moment);

type TipoRecorrencia = "quantidade" | "indeterminado";

type AgendaEvent = {
  id: Sessao["id"];
  title: string;
  start: Date;
  end: Date;
  resource: Sessao;
};

type SessaoParaCriar = {
  user_id: string;
  paciente_id: Paciente["id"];
  paciente_nome: string;
  data: string;
  hora: string;
  valor: number;
  status: "Agendada";
  status_pagamento: "pendente";
};

const STATUS_FORA_DA_AGENDA = [
  "cancelada",
  "cancelado",
  "faltou",
  "presente",
];

export default function AgendaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [visualizacao, setVisualizacao] = useState<View>(Views.WEEK);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [mensagem, setMensagem] = useState("");

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
    const user = await getCurrentUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: pacientesData, error: pacientesError } =
      await listPacientes(user.id);

    if (pacientesError) {
      alert(
        "Erro ao carregar pacientes: " +
          pacientesError.message
      );
      return;
    }

    const { data: sessoesData, error: sessoesError } =
      await listSessoes(user.id);

    if (sessoesError) {
      alert(
        "Erro ao carregar sessões: " +
          sessoesError.message
      );
      return;
    }

    setPacientes((pacientesData || []) as Paciente[]);
    setSessoes((sessoesData || []) as Sessao[]);
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  function criarDataHora(
    dataSessao: string,
    horaSessao: string
  ) {
    if (!dataSessao) return new Date();

    const [ano, mes, dia] = dataSessao
      .split("-")
      .map(Number);
    const [h, m] = (horaSessao || "08:00")
      .split(":")
      .map(Number);

    return new Date(
      ano,
      mes - 1,
      dia,
      h || 8,
      m || 0
    );
  }

  function formatarDataISO(dataObj: Date) {
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
    const dia = String(dataObj.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  function sessaoContaComoOcupada(sessao: Sessao) {
    const statusSessao = String(sessao.status || "")
      .trim()
      .toLowerCase();

    return !STATUS_FORA_DA_AGENDA.includes(statusSessao);
  }

  const eventos: AgendaEvent[] = sessoes
    .filter(sessaoContaComoOcupada)
    .map((s) => {
      const inicio = criarDataHora(s.data, s.hora || "08:00");
      const fim = new Date(inicio);

      fim.setHours(fim.getHours() + 1);

      return {
        id: s.id,
        title: s.paciente_nome || "Paciente",
        start: inicio,
        end: fim,
        resource: s,
      };
    });

  function horarioJaOcupado(
    dataTeste: string,
    horaTeste: string
  ) {
    return sessoes.some((s) => {
      return (
        s.data === dataTeste &&
        s.hora === horaTeste &&
        sessaoContaComoOcupada(s)
      );
    });
  }

  async function agendarSessao() {
    if (!pacienteId || !data || !hora) {
      alert("Preencha paciente, data e horário.");
      return;
    }

    const paciente = pacientes.find(
      (p) => String(p.id) === String(pacienteId)
    );

    if (!paciente) {
      alert("Paciente não encontrado.");
      return;
    }

    if (horarioJaOcupado(data, hora)) {
      alert(
        "Já existe uma sessão agendada nesse horário."
      );
      return;
    }

    const user = await getCurrentUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

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
        status_pagamento: "pendente",
      });
    }

    const conflito = sessoesParaCriar.find((sessao) =>
      horarioJaOcupado(sessao.data, sessao.hora)
    );

    if (conflito) {
      alert(
        `Já existe uma sessão em ${conflito.data} às ${conflito.hora}.`
      );
      return;
    }

    const { error } = await insertSessoes(sessoesParaCriar);

    if (error) {
      alert("Erro ao salvar sessão: " + error.message);
      return;
    }

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
    window.location.href = `/sessao/${evento.id}`;
  }

  function EventoPersonalizado({
    event,
  }: EventProps<AgendaEvent>) {
    return (
      <div className="agenda-event-content" title={event.title}>
        <span className="agenda-event-dot" />
        <span className="agenda-event-name">{event.title}</span>
      </div>
    );
  }

  return (
    <div className="agenda-page-shell">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="agenda-title">
            Agenda
          </h1>

          <p className="agenda-description">
            Organize sessões e atendimentos
          </p>
        </div>

        {!abrirForm && (
          <button
            className="btn btn-green"
            onClick={() => setAbrirForm(true)}
          >
            + Agendar sessão
          </button>
        )}
      </div>

      {abrirForm && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 2fr) repeat(3, minmax(120px, 1fr)) auto",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
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
            className="btn btn-green"
            onClick={agendarSessao}
          >
            Salvar
          </button>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns:
                "minmax(200px, 1fr) minmax(200px, 1fr) minmax(160px, 1fr) auto",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#cbd5e1",
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={repetir}
                onChange={(e) => setRepetir(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
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
              className="btn btn-outline"
              onClick={() => setAbrirForm(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mensagem && (
        <div
          style={{
            marginBottom: "18px",
            background: "rgba(62,207,142,0.12)",
            border: "1px solid rgba(62,207,142,0.4)",
            padding: "14px",
            borderRadius: "14px",
            color: "#86efac",
            fontWeight: 700,
          }}
        >
          {mensagem}
        </div>
      )}

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
          dayLayoutAlgorithm="no-overlap"
          components={{
            event: EventoPersonalizado,
          }}
          eventPropGetter={() => ({
            className: "agenda-session-event",
            style: {
              whiteSpace: "normal",
            },
          })}
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
    </div>
  );
}
