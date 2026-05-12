"use client";

import { useEffect, useState } from "react";
import supabase from "../lib/supabase";
import Janela from "../components/Janela";

export default function FrequenciaPage() {
  const [frequencias, setFrequencias] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [mes, setMes] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: freqData } = await supabase
      .from("frequência")
      .select("*")
      .order("id", { ascending: false });

    const { data: pacientesData } = await supabase
      .from("pacientes")
      .select("*")
      .order("nome", { ascending: true });

    setFrequencias(freqData || []);
    setPacientes(pacientesData || []);
  }

  function chaveMes(data: string) {
    if (!data) return "";

    if (data.includes("-")) {
      const partes = data.split("-");
      return `${partes[0]}-${partes[1]}`;
    }

    const partes = data.split("/");
    if (partes.length !== 3) return "";

    return `${partes[2]}-${partes[1]}`;
  }

  function nomeMes(chave: string) {
    if (!chave) return "Todos os meses";

    const [ano, mes] = chave.split("-");

    const nomes: any = {
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
    new Set(frequencias.map((f) => chaveMes(f.data)).filter(Boolean))
  );

  const filtradas = frequencias.filter((f) => {
    const nomePaciente = f.paciente_nome || "";
    const nomeOk = nomePaciente.toLowerCase().includes(busca.toLowerCase());
    const statusOk = status ? f.status === status : true;
    const mesOk = mes ? chaveMes(f.data) === mes : true;

    return nomeOk && statusOk && mesOk;
  });

  const presencas = filtradas.filter((f) => f.status === "Presente").length;
  const faltas = filtradas.filter((f) => f.status === "Faltou").length;
  const total = filtradas.length;
  const taxa = total > 0 ? Math.round((presencas / total) * 100) : 0;

  const financeiroPacientes = pacientes.map((paciente) => {
  const presencasPaciente = filtradas.filter((f) => {
  return (
    String(f.paciente_id) === String(paciente.id) &&
    f.status === "Presente"
  );
}).length;

    const valorSessao = Number(paciente.valor_sessao || paciente.valor || 0);
    const totalPaciente = presencasPaciente * valorSessao;

    return {
      nome: paciente.nome,
      presencas: presencasPaciente,
      valorSessao,
      totalPaciente,
    };
  });

  const totalGeral = financeiroPacientes.reduce(
    (total, p) => total + p.totalPaciente,
    0
  );

  return (
    <div>
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
            <h1 style={{ marginBottom: "6px" }}>Controle de Frequência</h1>

            <p className="page-description">
              Acompanhe presenças, faltas, comparecimento e resumo financeiro.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <Card titulo="Presenças" valor={presencas} cor="#86efac" />
          <Card titulo="Faltas" valor={faltas} cor="#fca5a5" />
          <Card titulo="Total" valor={total} cor="#f8fafc" />
          <Card titulo="Comparecimento" valor={`${taxa}%`} cor="#fde047" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <input
            placeholder="Buscar paciente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="Presente">Presente</option>
            <option value="Faltou">Faltou</option>
          </select>

          <select value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos os meses</option>

            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: "auto", marginBottom: "32px" }}>
          <table>
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
                    <strong>{item.paciente_nome}</strong>
                  </td>

                  <td>{item.data || "-"}</td>

                  <td>
                    <Status status={item.status} />
                  </td>

                  <td>{nomeMes(chaveMes(item.data))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtradas.length === 0 && (
            <p className="empty-text" style={{ padding: "18px" }}>
              Nenhum registro encontrado.
            </p>
          )}
        </div>

        <h2 style={{ marginBottom: "10px" }}>Resumo Financeiro</h2>

        <h3
          style={{
            color: "#86efac",
            marginBottom: "20px",
          }}
        >
          Total Geral: R$ {totalGeral.toFixed(2)}
        </h3>

        <div className="session-list">
          {financeiroPacientes.map((p) => (
            <div
              key={p.nome}
              className="lista-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "14px",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{p.nome}</strong>
                <p>{p.presencas} presença(s)</p>
              </div>

              <div style={{ textAlign: "right" }}>
                <p>R$ {p.valorSessao.toFixed(2)} / sessão</p>

                <strong style={{ color: "#86efac" }}>
                  R$ {p.totalPaciente.toFixed(2)}
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
  cor,
}: {
  titulo: string;
  valor: any;
  cor: string;
}) {
  return (
    <div className="psico-card">
      <span className="psico-label">{titulo}</span>

      <h2
        style={{
          marginTop: "8px",
          color: cor,
          fontSize: "26px",
        }}
      >
        {valor}
      </h2>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const classe =
    status === "Presente"
      ? "status-success"
      : status === "Faltou"
      ? "status-danger"
      : "status-neutral";

  return (
    <span className={`status-badge ${classe}`}>
      {status || "Sem status"}
    </span>
  );
}