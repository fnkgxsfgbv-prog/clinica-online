"use client";

import { useEffect, useState } from "react";
import supabase from "../../lib/supabase";
import Janela from "../../components/Janela";

export default function HistoricoFrequenciaPage() {
  const [frequencias, setFrequencias] = useState<any[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState("");

  useEffect(() => {
    carregarFrequencias();
  }, []);

  async function carregarFrequencias() {
    const { data, error } = await supabase
      .from("frequência")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert("Erro ao carregar histórico.");
      return;
    }

    setFrequencias(data || []);
  }

  function chaveMes(data: string) {
    if (!data) return "Sem data";

    if (data.includes("-")) {
      const partes = data.split("-");
      return `${partes[0]}-${partes[1]}`;
    }

    const partes = data.split("/");
    if (partes.length !== 3) return "Sem data";

    return `${partes[2]}-${partes[1]}`;
  }

  function nomeMes(chave: string) {
    if (chave === "Sem data") return "Sem data";

    const [ano, mes] = chave.split("-");

    const meses: any = {
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

    return `${meses[mes]} de ${ano}`;
  }

  function classeTaxa(taxa: number) {
    if (taxa >= 90) return "status-success";
    if (taxa >= 70) return "status-warning";
    return "status-danger";
  }

  const mesesDisponiveis = Array.from(
    new Set(frequencias.map((f) => chaveMes(f.data)))
  );

  const frequenciasFiltradas = mesSelecionado
    ? frequencias.filter((f) => chaveMes(f.data) === mesSelecionado)
    : frequencias;

  const agrupadoPorMes = frequenciasFiltradas.reduce((acc: any, item) => {
    const mes = chaveMes(item.data);

    if (!acc[mes]) acc[mes] = [];

    acc[mes].push(item);

    return acc;
  }, {});

  function resumirPorPaciente(itens: any[]) {
    const resumo: any = {};

    itens.forEach((item) => {
      const chave = item.paciente_id || item.paciente_nome || "sem-id";
      const nome = item.paciente_nome || "Paciente sem nome";

      if (!resumo[chave]) {
        resumo[chave] = {
          nome,
          presencas: 0,
          faltas: 0,
          total: 0,
        };
      }

      if (item.status === "Presente") resumo[chave].presencas += 1;
      if (item.status === "Faltou") resumo[chave].faltas += 1;

      resumo[chave].total += 1;
    });

    return Object.values(resumo);
  }

  return (
    <div>
      <Janela titulo="Histórico de Frequência">
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
              Resumo mensal por paciente
            </h1>

            <p className="page-description">
              Frequências agrupadas por mês, sem repetir o paciente na lista.
            </p>
          </div>

          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            style={{ maxWidth: "260px" }}
          >
            <option value="">Todos os meses</option>

            {mesesDisponiveis.map((mes) => (
              <option key={mes} value={mes}>
                {nomeMes(mes)}
              </option>
            ))}
          </select>
        </div>

        {Object.keys(agrupadoPorMes).length === 0 ? (
          <p className="empty-text">Nenhuma frequência encontrada.</p>
        ) : (
          <div style={{ display: "grid", gap: "22px" }}>
            {Object.keys(agrupadoPorMes).map((mes) => {
              const itens = agrupadoPorMes[mes];

              const presencas = itens.filter(
                (i: any) => i.status === "Presente"
              ).length;

              const faltas = itens.filter(
                (i: any) => i.status === "Faltou"
              ).length;

              const pacientesResumo = resumirPorPaciente(itens);

              return (
                <div key={mes} className="psico-card">
                  <h2 style={{ marginBottom: "14px" }}>
                    {nomeMes(mes)}
                  </h2>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "18px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="status-badge status-success">
                      Presenças: {presencas}
                    </span>

                    <span className="status-badge status-danger">
                      Faltas: {faltas}
                    </span>

                    <span className="status-badge status-neutral">
                      Total: {itens.length}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Paciente</th>
                          <th>Presenças</th>
                          <th>Faltas</th>
                          <th>Total</th>
                          <th>Comparecimento</th>
                        </tr>
                      </thead>

                      <tbody>
                        {pacientesResumo.map((paciente: any) => {
                          const taxa =
                            paciente.total > 0
                              ? Math.round(
                                  (paciente.presencas / paciente.total) * 100
                                )
                              : 0;

                          return (
                            <tr key={paciente.nome}>
                              <td>
                                <strong>{paciente.nome}</strong>
                              </td>

                              <td>
                                <span className="status-badge status-success">
                                  {paciente.presencas}
                                </span>
                              </td>

                              <td>
                                <span className="status-badge status-danger">
                                  {paciente.faltas}
                                </span>
                              </td>

                              <td>
                                <span className="status-badge status-neutral">
                                  {paciente.total}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`status-badge ${classeTaxa(taxa)}`}
                                >
                                  {taxa}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Janela>
    </div>
  );
}