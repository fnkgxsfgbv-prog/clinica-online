"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "../components/ui/Skeleton";
import AvisoViradaMesBanner from "../components/AvisoViradaMesBanner";
import FlashMessage from "../components/FlashMessage";
import FrequenciaSubnav from "../components/FrequenciaSubnav";
import Janela from "../components/Janela";
import PreferenciasMesPanel from "../components/PreferenciasMesPanel";
import { getCurrentUser } from "../lib/auth";
import { carregarFrequenciasCompleto } from "../lib/db/frequencia";
import {
  deveExecutarManutencaoFrequencia,
  marcarManutencaoFrequenciaExecutada,
} from "../lib/manutencao-frequencia";
import {
  chaveMes,
  indicePacientes,
  resolverPaciente,
} from "../lib/frequencia-utils";
import { formatarDataPaciente } from "../lib/datas-paciente";
import { labelMesAno, mesesComMesAtual } from "../lib/mes";
import { useFiltroMesCalendario } from "../lib/use-filtro-mes-calendario";
import { ordenarChavesMes, ordenarCronologico } from "../lib/ordenar-datas";
import { parseValorBr } from "../lib/moeda";
import { requireUserClient } from "../lib/require-user-client";
import {
  frequenciaPassaFiltroStatus,
  isStatusFaltou,
  isStatusPresente,
} from "../lib/status";
import type { Frequencia, Paciente } from "../types";

export default function FrequenciaPage() {
  const router = useRouter();
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const {
    mes,
    setMes,
    selecionarMesAtual,
    mesAtual,
    avisoViradaMes,
    dispensarAvisoViradaMes,
  } = useFiltroMesCalendario();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    void carregarDados();
    // carregarDados depende do router estável do Next e deve rodar só ao montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarDados(forcarManutencao = false) {
    setCarregando(true);
    setErro("");
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const manutencao =
      forcarManutencao || deveExecutarManutencaoFrequencia(user.id);

    const {
      pacientes: pList,
      frequencias: fList,
      error,
    } = await carregarFrequenciasCompleto(user.id, { manutencao });

    if (manutencao && !error) {
      marcarManutencaoFrequenciaExecutada(user.id);
    }

    if (error) {
      setErro("Erro ao carregar frequência: " + error.message);
      setFrequencias([]);
      setPacientes([]);
      setCarregando(false);
      return;
    }

    setFrequencias(fList);
    setPacientes(pList);
    setCarregando(false);
  }

  const mesesDisponiveis = useMemo(
    () =>
      ordenarChavesMes(
        mesesComMesAtual(frequencias.map((f) => chaveMes(f.data || ""))),
        "asc"
      ),
    [frequencias]
  );

  const filtradas = ordenarCronologico(
    frequencias.filter((f) => {
    const nomePaciente = f.paciente_nome || "";

    const nomeOk = nomePaciente
      .toLowerCase()
      .includes(busca.toLowerCase());

    const statusOk = frequenciaPassaFiltroStatus(status, f.status);

    const mesOk = mes ? chaveMes(f.data || "") === mes : true;

    return nomeOk && statusOk && mesOk;
    }),
    (f) => ({ data: f.data }),
    "asc"
  );

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

  async function gerarPDF() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Histórico de Frequência", 14, 20);

    doc.setFontSize(12);

    doc.text(
      `Período: ${labelMesAno(mes)}`,
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
        <FrequenciaSubnav />
        <AvisoViradaMesBanner
          aviso={avisoViradaMes}
          onDispensar={dispensarAvisoViradaMes}
        />
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

        {carregando ? (
          <PageSkeleton linhas={8} />
        ) : (
        <>
        <div className="frequency-page-header">
          <div>
            <p className="page-description">
              Acompanhe presenças, faltas e comparecimento.
              {mes ? (
                <>
                  {" "}
                  Período: <strong>{labelMesAno(mes)}</strong>
                </>
              ) : null}
            </p>
          </div>

          <button
            className="btn btn-green"
            onClick={() => void gerarPDF()}
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
              "1.5fr 1fr 1fr auto",
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
            onChange={(e) => setMes(e.target.value)}
          >
            <option value="">Todos os meses</option>

            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {labelMesAno(m)}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-outline"
            disabled={!mesAtual || mes === mesAtual}
            onClick={selecionarMesAtual}
          >
            Este mês
          </button>
        </div>

        <div style={{ marginBottom: "22px" }}>
          <PreferenciasMesPanel />
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
                    {item.data ? formatarDataPaciente(item.data) : "-"}
                  </td>

                  <td>
                    <Status
                      status={item.status || ""}
                    />
                  </td>

                  <td>
                    {labelMesAno(
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
        </>
        )}
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
