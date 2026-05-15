"use client";

import { useEffect, useState, type ReactNode } from "react";
import jsPDF from "jspdf";
import { getCurrentUser } from "../lib/auth";
import { carregarFrequenciasCompleto } from "../lib/db/frequencia";
import {
  chaveMes,
  indicePacientes,
  resolverPaciente,
} from "../lib/frequencia-utils";
import { parseValorBr } from "../lib/moeda";
import { isStatusFaltou, isStatusPresente } from "../lib/status";
import Janela from "../components/Janela";
import type { Frequencia, Paciente } from "../types";

export default function FrequenciaPage() {
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [mes, setMes] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const user = await getCurrentUser();
    if (!user) return;

    const { pacientes, frequencias } = await carregarFrequenciasCompleto(
      user.id
    );

    setFrequencias(frequencias);
    setPacientes(pacientes);
  }

  function nomeMes(chave: string) {
    if (!chave) return "Todos os meses";

    const [ano, mes] = chave.split("-");

    const nomes: Record<string, string> = {
      "01": "Janeiro",
      "02": "Fevereiro",
      "03": "Março",
      "04": "Abril",
      "05": "Maio",
      "06": "Junho",
      "07": "Julho",
      "08": "Agosto",
      "09": "Setembro",
      "10": "Outubro",
      "11": "Novembro",
      "12": "Dezembro",
    };

    return `${nomes[mes]} de ${ano}`;
  }

  const mesesDisponiveis = Array.from(
    new Set(frequencias.map((f) => chaveMes(f.data || "")).filter(Boolean))
  );

  const filtradas = frequencias.filter((f) => {
    const nomePaciente = f.paciente_nome || "";

    const nomeOk = nomePaciente
      .toLowerCase()
      .includes(busca.toLowerCase());

    const statusOk = status ? f.status === status : true;

    const mesOk = mes ? chaveMes(f.data || "") === mes : true;

    return nomeOk && statusOk && mesOk;
  });

  const presencas = filtradas.filter((f) => isStatusPresente(f.status)).length;

  const faltas = filtradas.filter((f) => isStatusFaltou(f.status)).length;

  const total = filtradas.length;

  const taxa =
    total > 0
      ? Math.round((presencas / total) * 100)
      : 0;

  const { porId, porNome } = indicePacientes(pacientes);

  const resumoPorChave = new Map<
    string,
    {
      nome: string;
      presencas: number;
      faltas: number;
      total: number;
      valorSessao: number;
    }
  >();

  for (const f of filtradas) {
    const paciente = resolverPaciente(
      porId,
      porNome,
      f.paciente_id,
      f.paciente_nome
    );
    const nome = paciente?.nome || f.paciente_nome || "Paciente";
    const chave = paciente ? String(paciente.id) : nome;
    const valorSessao = parseValorBr(
      paciente?.valor_sessao ?? paciente?.valor
    );

    let item = resumoPorChave.get(chave);
    if (!item) {
      item = {
        nome,
        presencas: 0,
        faltas: 0,
        total: 0,
        valorSessao,
      };
      resumoPorChave.set(chave, item);
    }

    item.total += 1;
    if (isStatusPresente(f.status)) item.presencas += 1;
    if (isStatusFaltou(f.status)) item.faltas += 1;
  }

  const resumoPacientes = Array.from(resumoPorChave.values())
    .map((item) => ({
      ...item,
      comparecimento:
        item.total > 0
          ? Math.round((item.presencas / item.total) * 100)
          : 0,
      totalFinanceiro: item.presencas * item.valorSessao,
    }))
    .filter((p) => p.total > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const totalGeral = resumoPacientes.reduce(
    (total, p) => total + p.totalFinanceiro,
    0
  );

  function gerarPDF() {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Histórico de Frequência", 14, 20);

    doc.setFontSize(12);

    doc.text(
      `Período: ${nomeMes(mes)}`,
      14,
      35
    );

    doc.text(
      `Presenças: ${presencas}`,
      14,
      45
    );

    doc.text(
      `Faltas: ${faltas}`,
      70,
      45
    );

    doc.text(
      `Total: ${total}`,
      120,
      45
    );

    doc.text(
      `Comparecimento: ${taxa}%`,
      14,
      55
    );

    let y = 75;

    doc.setFontSize(14);

    doc.text(
      "Resumo mensal por paciente",
      14,
      y
    );

    y += 12;

    doc.setFontSize(11);

    resumoPacientes.forEach((p) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(
        `${p.nome}`,
        14,
        y
      );

      doc.text(
        `Presenças: ${p.presencas}`,
        14,
        y + 7
      );

      doc.text(
        `Faltas: ${p.faltas}`,
        70,
        y + 7
      );

      doc.text(
        `Total: ${p.total}`,
        120,
        y + 7
      );

      doc.text(
        `${p.comparecimento}%`,
        170,
        y + 7
      );

      y += 18;
    });

    y += 10;

    doc.setFontSize(13);

    doc.text(
      `Total financeiro: R$ ${totalGeral.toFixed(2)}`,
      14,
      y
    );

    doc.save(
      `frequencia-${mes || "todos-os-meses"}.pdf`
    );
  }

  return (
    <div className="frequency-page">
      <Janela titulo="Frequência e Financeiro">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ marginBottom: "6px" }}>
              Controle de Frequência
            </h1>

            <p className="page-description">
              Acompanhe presenças, faltas,
              comparecimento e resumo financeiro.
            </p>
          </div>

          <button
            className="btn btn-green"
            onClick={gerarPDF}
          >
            Gerar PDF do mês
          </button>
        </div>

        <div
          className="frequency-metrics-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <Card
            titulo="Presenças"
            valor={presencas}
            variant="success"
          />

          <Card
            titulo="Faltas"
            valor={faltas}
            variant="danger"
          />

          <Card
            titulo="Total"
            valor={total}
            variant="neutral"
          />

          <Card
            titulo="Comparecimento"
            valor={`${taxa}%`}
            variant="attendance"
          />
        </div>

        <div
          className="frequency-filters"
          style={{
            display: "grid",
            gridTemplateColumns:
              "1.5fr 1fr 1fr",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <input
            placeholder="Buscar paciente..."
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
          >
            <option value="">
              Todos os status
            </option>

            <option value="Presente">
              Presente
            </option>

            <option value="Faltou">
              Faltou
            </option>
          </select>

          <select
            value={mes}
            onChange={(e) =>
              setMes(e.target.value)
            }
          >
            <option value="">
              Todos os meses
            </option>

            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </select>
        </div>

        <div
          className="frequency-table-wrap"
          style={{
            overflowX: "auto",
            marginBottom: "32px",
          }}
        >
          <table className="frequency-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Data</th>
                <th>Status</th>
                <th>Mês</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {item.paciente_nome}
                    </strong>
                  </td>

                  <td>
                    {item.data || "-"}
                  </td>

                  <td>
                    <Status
                      status={item.status || ""}
                    />
                  </td>

                  <td>
                    {nomeMes(
                      chaveMes(item.data || "")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtradas.length === 0 && (
            <p
              className="empty-text"
              style={{
                padding: "18px",
              }}
            >
              Nenhum registro encontrado.
            </p>
          )}
        </div>

        <h2
          style={{
            marginBottom: "10px",
          }}
        >
          Resumo Financeiro
        </h2>

        <h3
          style={{
            color: "#86efac",
            marginBottom: "20px",
          }}
        >
          Total Geral: R${" "}
          {totalGeral.toFixed(2)}
        </h3>

        <div className="session-list">
          {resumoPacientes.map((p) => (
            <div
              key={p.nome}
              className="lista-card"
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "14px",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{p.nome}</strong>

                <p>
                  {p.presencas} presença(s)
                </p>
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <p>
                  R${" "}
                  {p.valorSessao.toFixed(2)}{" "}
                  / sessão
                </p>

                <strong
                  style={{
                    color: "#86efac",
                  }}
                >
                  R${" "}
                  {p.totalFinanceiro.toFixed(
                    2
                  )}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </Janela>
    </div>
  );
}

function Card({
  titulo,
  valor,
  variant,
}: {
  titulo: string;
  valor: ReactNode;
  variant: "success" | "danger" | "neutral" | "attendance";
}) {
  return (
    <div className={`frequency-metric-card frequency-metric-${variant}`}>
      <div className="frequency-metric-topline">
        <span className="frequency-metric-dot" />
        <span>{titulo}</span>
      </div>

      <strong className="frequency-metric-value">
        {valor}
      </strong>
    </div>
  );
}

function Status({
  status,
}: {
  status: string;
}) {
  const classe = isStatusPresente(status)
    ? "status-success"
    : isStatusFaltou(status)
      ? "status-danger"
      : "status-neutral";

  return (
    <span className={`status-badge frequency-status-chip ${classe}`}>
      {status || "Sem status"}
    </span>
  );
}
