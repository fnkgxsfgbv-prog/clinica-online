"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import FlashMessage from "../components/FlashMessage";
import Janela from "../components/Janela";
import { getCurrentUser } from "../lib/auth";
import { carregarFrequenciasCompleto } from "../lib/db/frequencia";
import {
  deveExecutarManutencaoFrequencia,
  limparFlagManutencaoFrequencia,
  marcarManutencaoFrequenciaExecutada,
} from "../lib/manutencao-frequencia";
import { chaveMes } from "../lib/frequencia-utils";
import { ordenarChavesMes } from "../lib/ordenar-datas";
import {
  calcularResumoFinanceiro,
  calcularResumosSemanais,
  filtrarPorIntervaloDatas,
  filtrarPorMesReferencia,
  filtrarPorSemanaReferencia,
  inicioSemanaISO,
  labelSemana,
  semanaAnterior,
  semanaIntersectsMes,
  type ResumoFinanceiro,
} from "../lib/financeiro";
import { dataIsoHoje } from "../lib/datas-paciente";
import {
  detectarViradaMesFinanceiro,
  labelMesAno,
  mesAtualChave,
} from "../lib/mes";
import { diagnosticarIntegracaoFinanceiro } from "../lib/financeiro-diagnostico";
import {
  calcularFechamentoMes,
  rotuloVariacao,
} from "../lib/financeiro-fechamento";
import {
  exportarFechamentoMesXlsx,
  exportarFinanceiroXlsx,
} from "../lib/financeiro-export-xlsx";
import { requireUserClient } from "../lib/require-user-client";
import { isStatusPresente } from "../lib/status";
import type { Frequencia, Paciente, Sessao } from "../types";
import Link from "next/link";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}


function mesesComPresenca(
  frequencias: Frequencia[],
  sessoes: Sessao[]
): string[] {
  const chaves = new Set<string>();

  for (const f of frequencias) {
    if (!isStatusPresente(f.status)) continue;
    const m = chaveMes(f.data);
    if (m && m !== "sem-data") chaves.add(m);
  }

  const sessoesComFreq = new Set(
    frequencias
      .filter((f) => f.sessao_id != null && f.sessao_id !== "")
      .map((f) => String(f.sessao_id))
  );

  for (const s of sessoes) {
    if (sessoesComFreq.has(String(s.id))) continue;
    if (!isStatusPresente(s.status)) continue;
    const m = chaveMes(s.data);
    if (m && m !== "sem-data") chaves.add(m);
  }

  const atual = mesAtualChave();
  if (atual) chaves.add(atual);

  return ordenarChavesMes(Array.from(chaves), "asc");
}

function semanasComPresenca(
  frequencias: Frequencia[],
  sessoes: Sessao[]
): string[] {
  const chaves = new Set<string>();

  for (const f of frequencias) {
    if (!isStatusPresente(f.status)) continue;
    const semana = inicioSemanaISO(f.data);
    if (semana) chaves.add(semana);
  }

  const sessoesComFreq = new Set(
    frequencias
      .filter((f) => f.sessao_id != null && f.sessao_id !== "")
      .map((f) => String(f.sessao_id))
  );

  for (const s of sessoes) {
    if (sessoesComFreq.has(String(s.id))) continue;
    if (!isStatusPresente(s.status)) continue;
    const semana = inicioSemanaISO(s.data);
    if (semana) chaves.add(semana);
  }

  return Array.from(chaves).sort((a, b) => b.localeCompare(a));
}

function sufixoArquivoFinanceiro(
  mes: string,
  semana: string,
  dataInicio: string,
  dataFim: string
): string {
  const di = dataInicio.trim();
  const df = dataFim.trim();
  if (di && df) {
    const [a, b] = di <= df ? [di, df] : [df, di];
    return `${a}_a_${b}`;
  }
  if (semana.trim()) return `semana-${semana}`;
  return mes || "todos-os-periodos";
}

export default function FinanceiroPage() {
  const router = useRouter();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [frequencias, setFrequencias] = useState<Frequencia[]>([]);

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualChave);
  const [semanaSelecionada, setSemanaSelecionada] = useState("");
  /** Quando true, o filtro de mês acompanha o calendário (virada de mês). */
  const seguirMesCalendarioRef = useRef(true);
  const mesCalendarioRef = useRef(mesAtualChave());
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const intervaloAtivo = Boolean(dataInicio.trim() && dataFim.trim());
  const semanaAtiva = Boolean(semanaSelecionada.trim());
  const inicioSemanaAtual = inicioSemanaISO(dataIsoHoje()) ?? "";
  const inicioSemanaPassada = inicioSemanaAtual
    ? semanaAnterior(inicioSemanaAtual)
    : "";
  const mesAtual = mesAtualChave();

  const carregar = useCallback(async (forcarManutencao = false) => {
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
      sessoes: sList,
      frequencias: fList,
      error: loadError,
    } = await carregarFrequenciasCompleto(user.id, { manutencao });

    if (manutencao && !loadError) {
      marcarManutencaoFrequenciaExecutada(user.id);
    }

    if (loadError) {
      setErro(loadError.message);
      setPacientes([]);
      setSessoes([]);
      setFrequencias([]);
      setCarregando(false);
      return;
    }

    setPacientes(pList);
    setSessoes(sList);
    setFrequencias(fList);

    if (
      calcularResumoFinanceiro(pList, fList, sList).length === 0 &&
      (fList || []).some((f) => isStatusPresente(f.status))
    ) {
      setErro(
        "Há presenças na frequência, mas sem vínculo com pacientes. Tente sair e entrar de novo; se persistir, confira se está na conta correta."
      );
    } else {
      setErro("");
    }

    setCarregando(false);
  }, [router]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const { mudou, mesAtual } = detectarViradaMesFinanceiro();
    if (!mudou || !mesAtual) return;

    seguirMesCalendarioRef.current = true;
    mesCalendarioRef.current = mesAtual;
    setMesSelecionado(mesAtual);
    setSemanaSelecionada("");
    setDataInicio("");
    setDataFim("");
  }, []);

  useEffect(() => {
    if (intervaloAtivo || semanaAtiva || !seguirMesCalendarioRef.current) return;
    const atual = mesAtualChave();
    if (atual && mesSelecionado !== atual) {
      setMesSelecionado(atual);
      mesCalendarioRef.current = atual;
    }
  }, [carregando, intervaloAtivo, semanaAtiva, mesSelecionado]);

  useEffect(() => {
    function aplicarViradaMes() {
      const atual = mesAtualChave();
      if (!atual) return;
      if (intervaloAtivo || semanaAtiva) return;
      if (!seguirMesCalendarioRef.current) return;

      const anterior = mesCalendarioRef.current;
      mesCalendarioRef.current = atual;

      if (anterior && anterior !== atual) {
        setMesSelecionado(atual);
        return;
      }

      if (mesSelecionado === anterior && mesSelecionado !== atual) {
        setMesSelecionado(atual);
      }
    }

    aplicarViradaMes();
    const timer = window.setInterval(aplicarViradaMes, 60_000);
    const onVisibilidade = () => {
      if (document.visibilityState === "visible") aplicarViradaMes();
    };
    document.addEventListener("visibilitychange", onVisibilidade);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilidade);
    };
  }, [mesSelecionado, intervaloAtivo, semanaAtiva]);

  const mesesDisponiveis = useMemo(
    () => mesesComPresenca(frequencias, sessoes),
    [frequencias, sessoes]
  );

  const semanasDisponiveis = useMemo(
    () => semanasComPresenca(frequencias, sessoes),
    [frequencias, sessoes]
  );

  const frequenciasFiltradas = useMemo(() => {
    if (intervaloAtivo) {
      return filtrarPorIntervaloDatas(frequencias, dataInicio, dataFim);
    }
    if (semanaAtiva) {
      return filtrarPorSemanaReferencia(frequencias, semanaSelecionada);
    }
    return filtrarPorMesReferencia(frequencias, mesSelecionado);
  }, [
    frequencias,
    mesSelecionado,
    semanaSelecionada,
    semanaAtiva,
    dataInicio,
    dataFim,
    intervaloAtivo,
  ]);

  const sessoesFiltradas = useMemo(() => {
    if (intervaloAtivo) {
      return filtrarPorIntervaloDatas(sessoes, dataInicio, dataFim);
    }
    if (semanaAtiva) {
      return filtrarPorSemanaReferencia(sessoes, semanaSelecionada);
    }
    return filtrarPorMesReferencia(sessoes, mesSelecionado);
  }, [
    sessoes,
    mesSelecionado,
    semanaSelecionada,
    semanaAtiva,
    dataInicio,
    dataFim,
    intervaloAtivo,
  ]);

  const semanasNoPeriodo = useMemo(() => {
    if (intervaloAtivo || semanaAtiva || !mesSelecionado.trim()) {
      return semanasDisponiveis;
    }
    return semanasDisponiveis.filter((s) =>
      semanaIntersectsMes(s, mesSelecionado)
    );
  }, [
    semanasDisponiveis,
    mesSelecionado,
    intervaloAtivo,
    semanaAtiva,
  ]);

  const resumosSemanais = useMemo(() => {
    const usarFiltrados = intervaloAtivo || semanaAtiva || Boolean(mesSelecionado);
    return calcularResumosSemanais(
      pacientes,
      usarFiltrados ? frequenciasFiltradas : frequencias,
      usarFiltrados ? sessoesFiltradas : sessoes,
      semanasNoPeriodo
    );
  }, [
    pacientes,
    frequencias,
    sessoes,
    frequenciasFiltradas,
    sessoesFiltradas,
    semanasNoPeriodo,
    intervaloAtivo,
    semanaAtiva,
    mesSelecionado,
  ]);

  const dados = useMemo(
    () =>
      calcularResumoFinanceiro(
        pacientes,
        frequenciasFiltradas,
        sessoesFiltradas
      ),
    [pacientes, frequenciasFiltradas, sessoesFiltradas]
  );

  const totalGeral = dados.reduce((acc, item) => acc + item.total, 0);
  const totalPresencas = dados.reduce(
    (acc, item) => acc + item.presencas,
    0
  );

  const fechamento = useMemo(() => {
    if (!mesSelecionado.trim() || intervaloAtivo || semanaAtiva) return null;
    return calcularFechamentoMes(
      pacientes,
      frequencias,
      sessoes,
      mesSelecionado
    );
  }, [
    pacientes,
    frequencias,
    sessoes,
    mesSelecionado,
    intervaloAtivo,
    semanaAtiva,
  ]);

  const alertasFinanceiro = useMemo(() => {
    if (intervaloAtivo || semanaAtiva) {
      return diagnosticarIntegracaoFinanceiro(
        pacientes,
        frequenciasFiltradas,
        sessoesFiltradas
      );
    }
    return diagnosticarIntegracaoFinanceiro(
      pacientes,
      frequencias,
      sessoes,
      mesSelecionado.trim() || undefined
    );
  }, [
    pacientes,
    frequencias,
    sessoes,
    frequenciasFiltradas,
    sessoesFiltradas,
    mesSelecionado,
    intervaloAtivo,
    semanaAtiva,
  ]);

  const filtroAtivo = intervaloAtivo || semanaAtiva || Boolean(mesSelecionado);
  const labelFiltroAtivo = intervaloAtivo
    ? (() => {
        const di = dataInicio.trim();
        const df = dataFim.trim();
        const [a, b] = di <= df ? [di, df] : [df, di];
        const fmt = (iso: string) => {
          const [ano, mes, dia] = iso.split("-");
          return `${dia}/${mes}/${ano}`;
        };
        return `Intervalo ${fmt(a)} – ${fmt(b)}`;
      })()
    : semanaAtiva
      ? `Semana ${labelSemana(semanaSelecionada)}`
      : mesSelecionado
        ? labelMesAno(mesSelecionado)
        : "";

  const sufixoCsv = sufixoArquivoFinanceiro(
    mesSelecionado,
    semanaSelecionada,
    dataInicio,
    dataFim
  );

  function limparIntervalo() {
    setDataInicio("");
    setDataFim("");
  }

  function selecionarSemana(inicio: string) {
    setSemanaSelecionada(inicio);
    limparIntervalo();
  }

  function limparSemana() {
    setSemanaSelecionada("");
    if (!mesSelecionado.trim() && seguirMesCalendarioRef.current) {
      setMesSelecionado(mesAtualChave());
    }
  }

  function selecionarMesAtual() {
    const atual = mesAtualChave();
    if (!atual) return;
    seguirMesCalendarioRef.current = true;
    mesCalendarioRef.current = atual;
    setMesSelecionado(atual);
    limparSemana();
    limparIntervalo();
  }

  function limparFiltros() {
    selecionarMesAtual();
  }

  function aoMudarMes(valor: string) {
    const atual = mesAtualChave();
    seguirMesCalendarioRef.current = Boolean(valor && valor === atual);
    if (valor) mesCalendarioRef.current = valor;
    setMesSelecionado(valor);
    limparSemana();
  }

  return (
    <div className="financeiro-page">
      <Janela titulo="Financeiro">
        <div className="financeiro-header">
          <div>
            <h1 className="financeiro-title">Resumo Financeiro</h1>
            <p className="financeiro-subtitle">
              Presenças na frequência e sessões marcadas como presente. Valores
              por sessão ou cadastro do paciente.
              {intervaloAtivo ? (
                <>
                  {" "}
                  <strong>Intervalo de datas ativo</strong> — o recorte por mês
                  e por semana é ignorado enquanto início e fim estiverem
                  preenchidos.
                </>
              ) : semanaAtiva ? (
                <>
                  {" "}
                  <strong>
                    Semana {labelSemana(semanaSelecionada)}
                  </strong>{" "}
                  — segunda a domingo.
                </>
              ) : mesSelecionado ? (
                <>
                  {" "}
                  <strong>Período: {labelMesAno(mesSelecionado)}</strong>
                </>
              ) : null}
            </p>
          </div>

          <div className="financeiro-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              disabled={carregando}
              onClick={() => {
                void (async () => {
                  const user = await getCurrentUser();
                  if (user) limparFlagManutencaoFrequencia(user.id);
                  void carregar(true);
                })();
              }}
            >
              {carregando ? "Atualizando…" : "Sincronizar dados"}
            </button>
          </div>

          <div className="financeiro-toolbar-stack" aria-label="Filtros do financeiro">
            <section className="financeiro-filter-group">
              <div className="financeiro-filter-heading">
                <strong>Período do relatório</strong>
                <span>
                  Por padrão, o mês atual. Ao virar o calendário, o relatório
                  acompanha o novo mês.
                </span>
              </div>

              <div className="financeiro-period-row">
                <label className="financeiro-sr-only" htmlFor="financeiro-mes">
                  Período do relatório
                </label>
                <select
                  id="financeiro-mes"
                  className="financeiro-mes-select"
                  value={mesSelecionado}
                  onChange={(e) => aoMudarMes(e.target.value)}
                  disabled={carregando || intervaloAtivo || semanaAtiva}
                >
                  <option value="">Todos os períodos</option>
                  {mesesDisponiveis.map((m) => (
                    <option key={m} value={m}>
                      {labelMesAno(m)}
                    </option>
                  ))}
                </select>

                <div className="financeiro-filter-actions">
                  <button
                    type="button"
                    className={`btn btn-outline financeiro-week-chip${
                      mesSelecionado === mesAtual && !semanaAtiva && !intervaloAtivo
                        ? " is-active"
                        : ""
                    }`}
                    disabled={carregando || intervaloAtivo || semanaAtiva || !mesAtual}
                    onClick={selecionarMesAtual}
                  >
                    Este mês
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={carregando || dados.length === 0}
                      onClick={() => {
                        void (async () => {
                          try {
                            await exportarFinanceiroXlsx(
                              dados,
                              sufixoCsv,
                              labelFiltroAtivo || "Todos os períodos"
                            );
                          } catch (e) {
                            const msg = String(
                              (e as { message?: string } | null)?.message || e || ""
                            ).trim();
                            setErro(
                              msg
                                ? `Erro ao exportar planilha: ${msg}`
                                : "Erro ao exportar planilha."
                            );
                          }
                        })();
                      }}
                  >
                    Baixar planilha (Excel)
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void carregar()}
                    disabled={carregando}
                  >
                    Atualizar
                  </button>
                </div>
              </div>
            </section>

            <section className="financeiro-filter-group">
              <div className="financeiro-filter-heading">
                <strong>Ganhos por semana</strong>
                <span>Filtre o faturamento de uma semana específica.</span>
              </div>

              <div className="financeiro-week-row">
                <label className="financeiro-sr-only" htmlFor="financeiro-semana">
                  Semana
                </label>
                <select
                  id="financeiro-semana"
                  className="financeiro-mes-select"
                  value={semanaSelecionada}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor) selecionarSemana(valor);
                    else limparSemana();
                  }}
                  disabled={carregando || intervaloAtivo}
                >
                  <option value="">Todas as semanas</option>
                  {semanasDisponiveis.map((inicio) => (
                    <option key={inicio} value={inicio}>
                      {labelSemana(inicio)}
                    </option>
                  ))}
                </select>

                <div className="financeiro-filter-actions">
                  <button
                    type="button"
                    className={`btn btn-outline financeiro-week-chip${
                      semanaSelecionada === inicioSemanaAtual ? " is-active" : ""
                    }`}
                    disabled={
                      carregando || intervaloAtivo || !inicioSemanaAtual
                    }
                    onClick={() => selecionarSemana(inicioSemanaAtual)}
                  >
                    Esta semana
                  </button>

                  <button
                    type="button"
                    className={`btn btn-outline financeiro-week-chip${
                      semanaSelecionada === inicioSemanaPassada ? " is-active" : ""
                    }`}
                    disabled={
                      carregando || intervaloAtivo || !inicioSemanaPassada
                    }
                    onClick={() => selecionarSemana(inicioSemanaPassada)}
                  >
                    Semana passada
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={carregando || intervaloAtivo || !semanaAtiva}
                    onClick={limparSemana}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </section>

            <section className="financeiro-filter-group">
              <div className="financeiro-filter-heading">
                <strong>Intervalo personalizado</strong>
                <span>Use datas para filtrar um período específico.</span>
              </div>

              <div className="financeiro-date-row">
                <label className="financeiro-date-field" htmlFor="financeiro-de">
                  <span>De</span>
                  <input
                    id="financeiro-de"
                    className="financeiro-date-input"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      limparSemana();
                    }}
                    disabled={carregando}
                  />
                </label>

                <label className="financeiro-date-field" htmlFor="financeiro-ate">
                  <span>Até</span>
                  <input
                    id="financeiro-ate"
                    className="financeiro-date-input"
                    type="date"
                    value={dataFim}
                    onChange={(e) => {
                      setDataFim(e.target.value);
                      limparSemana();
                    }}
                    disabled={carregando}
                  />
                </label>

                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={carregando || (!dataInicio && !dataFim)}
                  onClick={() => {
                    limparIntervalo();
                    limparSemana();
                  }}
                >
                  Limpar
                </button>
              </div>
            </section>
          </div>
        </div>

        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}

        {!carregando && alertasFinanceiro.length > 0 ? (
          <section
            className="financeiro-alertas"
            aria-label="Avisos de integração agenda e financeiro"
          >
            <div className="financeiro-alertas-header">
              <strong>Revisar vínculos e valores na agenda</strong>
              <span>
                {alertasFinanceiro.length} ponto(s) para conferir no período
                {mesSelecionado && !intervaloAtivo && !semanaAtiva
                  ? ` (${labelMesAno(mesSelecionado)})`
                  : ""}
                .
              </span>
            </div>
            <ul className="financeiro-alertas-lista">
              {alertasFinanceiro.slice(0, 8).map((alerta) => (
                <li key={alerta.id} className={`financeiro-alerta is-${alerta.tipo}`}>
                  <div>
                    <strong>{alerta.titulo}</strong>
                    <p>{alerta.detalhe}</p>
                  </div>
                  {alerta.href ? (
                    <Link className="btn btn-outline btn-sm" href={alerta.href}>
                      Ver
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
            {alertasFinanceiro.length > 8 ? (
              <p className="financeiro-alertas-mais">
                + {alertasFinanceiro.length - 8} aviso(s). Ajuste na agenda ou no
                cadastro do paciente.
              </p>
            ) : null}
          </section>
        ) : null}

        {!carregando && fechamento ? (
          <section className="financeiro-fechamento" aria-label="Fechamento do mês">
            <div className="financeiro-fechamento-header">
              <div>
                <strong>Fechamento — {fechamento.label}</strong>
                <span>Resumo do mês com comparativo ao período anterior.</span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={fechamento.linhas.length === 0}
                onClick={() => {
                  void (async () => {
                    try {
                      await exportarFechamentoMesXlsx(fechamento);
                    } catch (e) {
                      const msg = String(
                        (e as { message?: string } | null)?.message || e || ""
                      ).trim();
                      setErro(
                        msg
                          ? `Erro ao exportar fechamento: ${msg}`
                          : "Erro ao exportar fechamento."
                      );
                    }
                  })();
                }}
              >
                Baixar fechamento do mês
              </button>
            </div>

            <div className="financeiro-fechamento-grid">
              <div className="financeiro-fechamento-card">
                <span>Total faturado</span>
                <strong>{formatarMoeda(fechamento.totais.total)}</strong>
                {fechamento.totaisAnterior ? (
                  <em>
                    vs mês anterior:{" "}
                    {rotuloVariacao(
                      fechamento.totais.total,
                      fechamento.totaisAnterior.total
                    )}
                  </em>
                ) : null}
              </div>
              <div className="financeiro-fechamento-card">
                <span>Presenças</span>
                <strong>{fechamento.totais.presencas}</strong>
                {fechamento.totaisAnterior ? (
                  <em>
                    {rotuloVariacao(
                      fechamento.totais.presencas,
                      fechamento.totaisAnterior.presencas
                    )}
                  </em>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {!carregando && filtroAtivo ? (
          <div
            className="financeiro-filtro-ativo"
            role="status"
            aria-live="polite"
          >
            <span className="financeiro-filtro-ativo-label">
              Filtrando: <strong>{labelFiltroAtivo}</strong>
            </span>
            <button
              type="button"
              className="btn btn-outline financeiro-filtro-ativo-limpar"
              onClick={limparFiltros}
            >
              Limpar filtro
            </button>
          </div>
        ) : null}

        <div className="financeiro-totais">
          <div className="financeiro-total-card">
            <span className="financeiro-total-label">Total faturado</span>
            <strong className="financeiro-total-valor">
              {formatarMoeda(totalGeral)}
            </strong>
          </div>

          <div className="financeiro-total-card">
            <span className="financeiro-total-label">Presenças</span>
            <strong className="financeiro-total-valor">
              {totalPresencas}
            </strong>
          </div>

          <div className="financeiro-total-card">
            <span className="financeiro-total-label">Pacientes</span>
            <strong className="financeiro-total-valor">{dados.length}</strong>
          </div>
        </div>

        {!carregando &&
        !intervaloAtivo &&
        resumosSemanais.length > 0 ? (
          <section
            className="financeiro-semanas-resumo"
            aria-label="Ganhos por semana"
          >
            <div className="financeiro-semanas-resumo-header">
              <strong>Ganhos por semana</strong>
              <span>
                {mesSelecionado && !semanaAtiva && !intervaloAtivo
                  ? `Semanas de ${labelMesAno(mesSelecionado)}. Clique para filtrar abaixo.`
                  : "Clique em uma semana para filtrar os pacientes abaixo."}
              </span>
            </div>

            <div className="financeiro-semanas-grid">
              {resumosSemanais.map((semana) => (
                <button
                  key={semana.inicio}
                  type="button"
                  className={`financeiro-semana-card${
                    semanaSelecionada === semana.inicio ? " is-active" : ""
                  }`}
                  onClick={() => selecionarSemana(semana.inicio)}
                >
                  <span className="financeiro-semana-card-label">
                    {semana.label}
                  </span>
                  <strong className="financeiro-semana-card-valor">
                    {formatarMoeda(semana.total)}
                  </strong>
                  <span className="financeiro-semana-card-meta">
                    {semana.presencas} presença(s) · {semana.pacientes}{" "}
                    paciente(s)
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {carregando ? (
          <p className="empty-text">Carregando resumo...</p>
        ) : dados.length === 0 ? (
          <p className="empty-text">
            Nenhum dado financeiro para exibir neste período.
            {!erro ? (
              <>
                {" "}
                Marque sessões como &quot;Presente&quot; na agenda ou escolha
                outro recorte.
              </>
            ) : null}
          </p>
        ) : (
          <div className="financeiro-lista">
            {dados.map((p) => (
              <div key={String(p.id)} className="psico-row financeiro-row">
                <div>
                  <strong className="financeiro-paciente-nome">
                    {p.nome}
                  </strong>
                  <p className="financeiro-paciente-meta">
                    {p.presencas} presença(s) · média{" "}
                    {formatarMoeda(p.valor)}/sessão
                  </p>
                </div>

                <div className="financeiro-valores">
                  <strong className="financeiro-valor-total">
                    {formatarMoeda(p.total)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </Janela>
    </div>
  );
}
