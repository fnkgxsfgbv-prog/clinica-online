"use client";

import { useEffect, useState } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pt-br.js";
import "react-big-calendar/lib/css/react-big-calendar.css";
import supabase from "../lib/supabase";

moment.locale("pt-br");

const localizer = momentLocalizer(moment);

export default function AgendaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [visualizacao, setVisualizacao] = useState<any>(Views.WEEK);

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
const [mensagem, setMensagem] = useState("");
  const [abrirForm, setAbrirForm] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [valor, setValor] = useState("");

  const [repetir, setRepetir] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState("quantidade");
  const [quantidadeSemanas, setQuantidadeSemanas] = useState("4");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: pacientesData, error: pacientesError } = await supabase
      .from("pacientes")
      .select("*")
      .order("nome", { ascending: true });

    if (pacientesError) {
      alert("Erro ao carregar pacientes: " + pacientesError.message);
      return;
    }

    const { data: sessoesData, error: sessoesError } = await supabase
  .from("sessoes")
  .select("*")
  .not("status", "in", '("Cancelada","cancelada","Cancelado","cancelado")')
  .order("data", { ascending: true });

    if (sessoesError) {
      alert("Erro ao carregar sessões: " + sessoesError.message);
      return;
    }

    setPacientes(pacientesData || []);
    setSessoes(sessoesData || []);
  }

  function criarDataHora(dataSessao: string, horaSessao: string) {
    if (!dataSessao) return new Date();

    const [ano, mes, dia] = dataSessao.split("-").map(Number);
    const [h, m] = (horaSessao || "08:00").split(":").map(Number);

    return new Date(ano, mes - 1, dia, h || 8, m || 0);
  }

  function formatarDataISO(dataObj: Date) {
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
    const dia = String(dataObj.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  const eventos = sessoes
  .filter((s) => {
    const statusSessao = String(s.status || "")
      .trim()
      .toLowerCase();

    return ![
      "cancelada",
      "cancelado",
      "faltou",
      "presente",
    ].includes(statusSessao);
  })
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

  async function agendarSessao() {
    if (!pacienteId || !data || !hora) {
      alert("Preencha paciente, data e horário.");
      return;
    }

    const paciente = pacientes.find(
      (p) => String(p.id) === String(pacienteId)
    );
    const statusIgnorados = ["cancelada", "cancelado", "faltou", "presente"];

function horarioJaOcupado(dataTeste: string, horaTeste: string) {
  return sessoes.some((s) => {
    const statusSessao = String(s.status || "")
      .trim()
      .toLowerCase();

    return (
      s.data === dataTeste &&
      s.hora === horaTeste &&
      !statusIgnorados.includes(statusSessao)
    );
  });
}

if (!repetir) {
  if (horarioJaOcupado(data, hora)) {
    alert("Já existe uma sessão agendada nesse dia e horário.");
    return;
  }


}
const horarioOcupado = sessoes.some((s) => {
  const statusSessao = String(s.status || "")
    .trim()
    .toLowerCase();

  return (
    s.data === data &&
    s.hora === hora &&
    !["cancelada", "cancelado", "faltou", "presente"].includes(statusSessao)
  );
});

if (horarioOcupado) {
  alert("Já existe uma sessão agendada nesse dia e horário.");
  return;
}
    if (!paciente) {
      alert("Paciente não encontrado.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const semanas = repetir
      ? tipoRecorrencia === "indeterminado"
        ? 26
        : Math.max(1, Number(quantidadeSemanas || 1))
      : 1;

    const sessoesParaCriar = [];

    for (let i = 0; i < semanas; i++) {
      const dataBase = criarDataHora(data, hora);
      dataBase.setDate(dataBase.getDate() + i * 7);

      sessoesParaCriar.push({
        user_id: user?.id,
        paciente_id: paciente.id,
        paciente_nome: paciente.nome,
        data: formatarDataISO(dataBase),
        hora,
        valor: Number(valor || paciente.valor_sessao || 0),
        status: "Agendada",
        status_pagamento: "pendente",
      });
    }
const conflito = sessoesParaCriar.find((sessao: any) =>
  horarioJaOcupado(sessao.data, sessao.hora)
);

if (conflito) {
  alert(
    `Já existe uma sessão agendada em ${conflito.data} às ${conflito.hora}.`
  );
  return;
}
    const { error } = await supabase.from("sessoes").insert(sessoesParaCriar);

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

    carregarDados();
  }

  function clicarEvento(evento: any) {
    const sessao = evento.resource;
    window.location.href = `/sessao/${sessao.id}`;
  }

  function EventoPersonalizado({ event }: any) {
    return (
      <div
        style={{
          whiteSpace: "normal",
          wordBreak: "break-word",
          overflow: "hidden",
          lineHeight: "1.2",
          fontSize: "12px",
          fontWeight: 700,
          padding: "2px",
        }}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        borderRadius: "24px",
        background: "rgba(15,23,42,0.75)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "42px",
              fontWeight: "800",
              color: "white",
            }}
          >
            Agenda
          </h1>

          <p style={{ color: "#94a3b8" }}>
            Organize sessões e atendimentos
          </p>
        </div>

        <button
          className="btn btn-green"
          onClick={() => setAbrirForm(!abrirForm)}
        >
          + Agendar sessão
        </button>
      </div>

      {abrirForm && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <select
            value={pacienteId}
            onChange={(e) => {
              const id = e.target.value;
              setPacienteId(id);

              const paciente = pacientes.find(
                (p) => String(p.id) === String(id)
              );

              setValor(paciente?.valor_sessao || "");
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

          <button className="btn btn-green" onClick={agendarSessao}>
            Salvar
          </button>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginTop: "4px",
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
                  onChange={(e) => setTipoRecorrencia(e.target.value)}
                >
                  <option value="quantidade">Por quantidade de semanas</option>
                  <option value="indeterminado">
                    Tempo indeterminado - 6 meses
                  </option>
                </select>

                {tipoRecorrencia === "quantidade" && (
                  <input
                    type="number"
                    min="1"
                    max="52"
                    placeholder="Quantidade de semanas"
                    value={quantidadeSemanas}
                    onChange={(e) => setQuantidadeSemanas(e.target.value)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          height: "75vh",
          background: "rgba(255,255,255,0.03)",
          padding: "18px",
          borderRadius: "20px",
        }}
      >
        <Calendar
          localizer={localizer}
          events={eventos}
          startAccessor="start"
          endAccessor="end"
          date={dataAtual}
          view={visualizacao}
          onNavigate={(novaData) => setDataAtual(novaData)}
          onView={(novaVisualizacao) => setVisualizacao(novaVisualizacao)}
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
            style: {
              minHeight: "70px",
              height: "auto",
              whiteSpace: "normal",
              overflow: "hidden",
              borderRadius: "10px",
              padding: "6px",
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: "1.2",
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