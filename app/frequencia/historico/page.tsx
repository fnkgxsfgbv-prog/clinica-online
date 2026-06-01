"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FlashMessage from "../../components/FlashMessage";
import Janela from "../../components/Janela";
import { getCurrentUser } from "../../lib/auth";
import {
  FREQUENCIA_HISTORICO_PAGE_SIZE,
  fetchHistoricoFrequenciaPage,
} from "../../lib/db/frequencia";
import { chaveMes } from "../../lib/frequencia-utils";
import { formatarDataPaciente } from "../../lib/datas-paciente";
import { labelMesAno } from "../../lib/mes";
import { ordenarChavesMes, ordenarCronologico } from "../../lib/ordenar-datas";
import { deduplicarFrequenciasPorSessao } from "../../lib/frequencia-utils";
import { isStatusFaltou, isStatusPresente } from "../../lib/status";
import { requireUserClient } from "../../lib/require-user-client";
import type { Frequencia, Paciente, Sessao } from "../../types";

export default function HistoricoFrequenciaPage() {
  const router = useRouter();
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  const [contextoCache, setContextoCache] = useState<{
    pacientes: Paciente[];
    sessoes: Sessao[];
  } | null>(null);
  const [totalFrequencias, setTotalFrequencias] = useState<number | null>(
    null
  );
  const [mesSelecionado, setMesSelecionado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    void carregarFrequencias();
    // carregarFrequencias depende do router estável do Next e deve rodar só ao montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarFrequencias() {
    setCarregando(true);
    setErro("");
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const res = await fetchHistoricoFrequenciaPage(
      user.id,
      0,
      FREQUENCIA_HISTORICO_PAGE_SIZE
    );

    if (res.error) {
      setErro("Erro ao carregar histórico: " + res.error.message);
      setFrequencias([]);
      setContextoCache(null);
      setTotalFrequencias(null);
      setCarregando(false);
      return;
    }

    setFrequencias(
      ordenarCronologico(res.frequencias, (f) => ({ data: f.data }), "asc")
    );
    setContextoCache({
      pacientes: res.pacientes,
      sessoes: res.sessoes,
    });
    setTotalFrequencias(res.total);
    setCarregando(false);
  }

  async function carregarMaisHistorico() {
    if (
      !contextoCache ||
      totalFrequencias == null ||
      frequencias.length >= totalFrequencias
    ) {
      return;
    }

    setCarregandoMais(true);
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregandoMais(false);
      return;
    }

    const res = await fetchHistoricoFrequenciaPage(
      user.id,
      frequencias.length,
      FREQUENCIA_HISTORICO_PAGE_SIZE,
      contextoCache
    );

    if (res.error) {
      setErro("Erro ao carregar mais: " + res.error.message);
      setCarregandoMais(false);
      return;
    }

    if (res.frequencias.length) {
      setFrequencias((f) =>
        ordenarCronologico(
          [...f, ...res.frequencias],
          (item) => ({ data: item.data }),
          "asc"
        )
      );
    }

    setCarregandoMais(false);
  }

  function classeTaxa(taxa: number) {
    if (taxa >= 90) return "status-success";
    if (taxa >= 70) return "status-warning";
    return "status-danger";
  }

  const mesesDisponiveisOrdenados = ordenarChavesMes(
    Array.from(
      new Set(
        frequencias.map((f) => chaveMes(f.data)).filter((m) => m !== "sem-data")
      )
    ),
    "asc"
  );

  const frequenciasFiltradas = mesSelecionado
    ? frequencias.filter((f) => chaveMes(f.data) === mesSelecionado)
    : frequencias;

  const agrupadoPorMes = frequenciasFiltradas.reduce<
    Record<string, Frequencia[]>
  >((acc, item) => {
    const mes = chaveMes(item.data);

    if (!acc[mes]) acc[mes] = [];

    acc[mes].push(item);

    return acc;
  }, {});

  const mesesOrdenados = ordenarChavesMes(Object.keys(agrupadoPorMes), "asc");

  for (const mes of mesesOrdenados) {
    agrupadoPorMes[mes] = ordenarCronologico(
      agrupadoPorMes[mes],
      (item) => ({ data: item.data }),
      "asc"
    );
  }

  function resumirPorPaciente(itens: Frequencia[]) {
    const resumo: Record<
      string,
      { nome: string; presencas: number; faltas: number; total: number }
    > = {};

    deduplicarFrequenciasPorSessao(itens).forEach((item) => {
      const chave = String(item.paciente_id || item.paciente_nome || "sem-id");
      const nome = item.paciente_nome || "Paciente sem nome";

      if (!resumo[chave]) {
        resumo[chave] = {
          nome,
          presencas: 0,
          faltas: 0,
          total: 0,
        };
      }

      if (isStatusPresente(item.status)) resumo[chave].presencas += 1;
      if (isStatusFaltou(item.status)) resumo[chave].faltas += 1;

      resumo[chave].total += 1;
    });

    return Object.values(resumo);
  }

  const temMaisNoServidor =
    totalFrequencias != null && frequencias.length < totalFrequencias;

  return (
    <div>
      <Janela titulo="Histórico de Frequência">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

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
              Frequências agrupadas por mês. Carregue mais registos para ver
              períodos mais antigos.
            </p>
          </div>

          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            style={{ maxWidth: "260px" }}
          >
            <option value="">Todos os meses (carregados)</option>

            {mesesDisponiveisOrdenados.map((mes) => (
              <option key={mes} value={mes}>
                {labelMesAno(mes)}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <p className="empty-text">Carregando histórico...</p>
        ) : mesesOrdenados.length === 0 ? (
          <p className="empty-text">Nenhuma frequência encontrada.</p>
        ) : (
          <>
            <div style={{ display: "grid", gap: "22px" }}>
              {mesesOrdenados.map((mes) => {
                const itens = agrupadoPorMes[mes];

                const presencas = itens.filter((i) =>
                  isStatusPresente(i.status)
                ).length;

                const faltas = itens.filter((i) => isStatusFaltou(i.status))
                  .length;

                const pacientesResumo = resumirPorPaciente(itens);

                return (
                  <div key={mes} className="psico-card">
                    <h2 style={{ marginBottom: "14px" }}>
                      {labelMesAno(mes)}
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
                          {pacientesResumo.map((paciente, idx) => {
                            const taxa =
                              paciente.total > 0
                                ? Math.round(
                                    (paciente.presencas / paciente.total) *
                                      100
                                  )
                                : 0;

                            return (
                              <tr
                                key={`${mes}-${paciente.nome}-${String(idx)}`}
                              >
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

            {!mesSelecionado && temMaisNoServidor ? (
              <div style={{ marginTop: "24px", textAlign: "center" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={carregandoMais}
                  onClick={() => void carregarMaisHistorico()}
                >
                  {carregandoMais
                    ? "Carregando…"
                    : `Carregar mais registos (${frequencias.length} de ${totalFrequencias})`}
                </button>
              </div>
            ) : null}
          </>
        )}
      </Janela>
    </div>
  );
}
