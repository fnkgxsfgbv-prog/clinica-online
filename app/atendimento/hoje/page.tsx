"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import FlashMessage from "../../components/FlashMessage";
import Janela from "../../components/Janela";
import RichTextEditor from "../../components/RichTextEditor";
import EmptyState from "../../components/ui/EmptyState";
import { PageSkeleton } from "../../components/ui/Skeleton";
import { getCurrentUser } from "../../lib/auth";
import { listEvolucoesPorPacientePorId } from "../../lib/db/evolucoes";
import { listSessoesDoDia } from "../../lib/db/sessoes";
import {
  ordenarSessoesPorHorario,
  proximaSessaoHojeId,
  resumoDia,
  rotuloResumoDia,
  sessaoAindaPendente,
} from "../../lib/dashboard-agenda-hoje";
import {
  dataIsoHoje,
  formatarDataPaciente,
} from "../../lib/datas-paciente";
import { requireUserClient } from "../../lib/require-user-client";
import {
  obterRegistroAnotacoesSessao,
  resumoCampoEvolucao,
  temConteudoTexto,
  textoPlanoDeAnotacoes,
  ultimaEvolucaoClinica,
} from "../../lib/sessao-anotacoes";
import { persistirAnotacaoSessao } from "../../lib/persistir-anotacao-sessao";
import { atualizarStatusSessaoComFrequencia } from "../../lib/sessao-status";
import { isStatusCancelada, visualFrequenciaAgenda } from "../../lib/status";
import type { Evolucao, Sessao } from "../../types";

function formatarHorario(hora?: string | null) {
  return hora ? hora.slice(0, 5) : "--:--";
}

function rotuloDiaHoje(dataIso: string) {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(
    new Date(
      Number(dataIso.slice(0, 4)),
      Number(dataIso.slice(5, 7)) - 1,
      Number(dataIso.slice(8, 10))
    )
  );
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function sessaoConcluida(sessao: Sessao) {
  return !sessaoAindaPendente(sessao);
}

export default function ModoSessaoHojePage() {
  const router = useRouter();
  const hoje = dataIsoHoje();

  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessaoAtivaId, setSessaoAtivaId] = useState<string | number | null>(
    null
  );
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [registro, setRegistro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [carregandoEvolucoes, setCarregandoEvolucoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const registroRef = useRef("");
  const autosaveTimerRef = useRef<number | null>(null);

  const sessaoAtiva = useMemo(
    () => sessoes.find((s) => String(s.id) === String(sessaoAtivaId)) ?? null,
    [sessoes, sessaoAtivaId]
  );

  const ultimaClinica = useMemo(
    () =>
      sessaoAtiva
        ? ultimaEvolucaoClinica(evolucoes, sessaoAtiva.id)
        : null,
    [evolucoes, sessaoAtiva]
  );

  const resumo = resumoDia(sessoes);
  const concluidas = sessoes.filter(sessaoConcluida).length;

  const carregarSessoes = useCallback(async () => {
    setCarregando(true);
    setErro("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const res = await listSessoesDoDia(user.id, hoje);
    if (res.error) {
      setErro(res.error.message);
      setSessoes([]);
      setCarregando(false);
      return;
    }

    const lista = ordenarSessoesPorHorario((res.data || []) as Sessao[]);
    setSessoes(lista);

    const proxima =
      proximaSessaoHojeId(lista) ?? lista[0]?.id ?? null;
    setSessaoAtivaId(proxima);
    setCarregando(false);
  }, [router, hoje]);

  useEffect(() => {
    void carregarSessoes();
  }, [carregarSessoes]);

  useEffect(() => {
    registroRef.current = registro;
  }, [registro]);

  const carregarEvolucoesPaciente = useCallback(
    async (sessao: Sessao) => {
      setCarregandoEvolucoes(true);

      const user = await requireUserClient(router, getCurrentUser);
      if (!user) {
        setCarregandoEvolucoes(false);
        return;
      }

      const res = await listEvolucoesPorPacientePorId(
        user.id,
        sessao.paciente_id
      );

      if (res.error) {
        setErro(res.error.message);
        setEvolucoes([]);
        setRegistro("");
        setCarregandoEvolucoes(false);
        return;
      }

      const lista = (res.data || []) as Evolucao[];
      setEvolucoes(lista);
      const anotacao = obterRegistroAnotacoesSessao(lista, sessao.id);
      setRegistro(textoPlanoDeAnotacoes(anotacao));
      setCarregandoEvolucoes(false);
    },
    [router]
  );

  useEffect(() => {
    if (!sessaoAtiva) return;
    void carregarEvolucoesPaciente(sessaoAtiva);
  }, [sessaoAtiva?.id, carregarEvolucoesPaciente, sessaoAtiva]);

  useEffect(() => {
    if (!sessaoAtiva || carregandoEvolucoes) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void salvarRegistro(true);
    }, 900);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registro, sessaoAtiva?.id, carregandoEvolucoes]);

  async function salvarRegistro(silencioso = false) {
    if (!sessaoAtiva) return;

    if (!temConteudoTexto(registroRef.current)) {
      if (!silencioso) {
        setMensagem("Escreva algo no registro antes de salvar.");
        window.setTimeout(() => setMensagem(""), 2500);
      }
      return;
    }

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    setSalvando(true);
    const res = await persistirAnotacaoSessao({
      userId: user.id,
      sessao: sessaoAtiva,
      texto: registroRef.current,
      evolucoes,
    });

    if (res.error) {
      setErro(res.error.message);
      setSalvando(false);
      return;
    }

    if (!res.skipped) {
      const atualizado = await listEvolucoesPorPacientePorId(
        user.id,
        sessaoAtiva.paciente_id
      );
      if (!atualizado.error) {
        setEvolucoes((atualizado.data || []) as Evolucao[]);
      }
      if (!silencioso) {
        setMensagem("Registro salvo.");
        window.setTimeout(() => setMensagem(""), 2500);
      }
    }

    setSalvando(false);
  }

  async function aplicarStatus(novoStatus: string) {
    if (!sessaoAtiva) return;

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    setSalvando(true);
    setErro("");

    const res = await atualizarStatusSessaoComFrequencia(
      user.id,
      sessaoAtiva,
      novoStatus
    );

    if (res.error) {
      setErro(res.error.message);
      setSalvando(false);
      return;
    }

    setSessoes((atual) =>
      atual.map((s) =>
        String(s.id) === String(sessaoAtiva.id)
          ? { ...s, status: novoStatus }
          : s
      )
    );

    setMensagem(`Marcado como ${novoStatus}.`);
    window.setTimeout(() => setMensagem(""), 2500);
    setSalvando(false);
  }

  function selecionarSessao(id: string | number) {
    setSessaoAtivaId(id);
    setErro("");
    setMensagem("");
  }

  function proximaPendente(excluirId?: string | number) {
    const pendentes = sessoes.filter(
      (s) =>
        sessaoAindaPendente(s) &&
        (excluirId == null || String(s.id) !== String(excluirId))
    );
    return pendentes[0] ?? null;
  }

  async function concluirEProxima() {
    if (!sessaoAtiva) return;

    setSalvando(true);
    setErro("");

    await salvarRegistro(true);

    const aindaPendente = sessaoAindaPendente(
      sessoes.find((s) => String(s.id) === String(sessaoAtiva.id)) ?? sessaoAtiva
    );

    if (aindaPendente) {
      const user = await requireUserClient(router, getCurrentUser);
      if (user) {
        const res = await atualizarStatusSessaoComFrequencia(
          user.id,
          sessaoAtiva,
          "Presente"
        );
        if (res.error) {
          setErro(res.error.message);
          setSalvando(false);
          return;
        }
        setSessoes((atual) =>
          atual.map((s) =>
            String(s.id) === String(sessaoAtiva.id)
              ? { ...s, status: "Presente" }
              : s
          )
        );
      }
    }

    const proxima = proximaPendente(sessaoAtiva.id);
    setSalvando(false);

    if (proxima) {
      setSessaoAtivaId(proxima.id);
      setMensagem("");
      return;
    }

    setMensagem("Dia concluído — todas as sessões foram registradas.");
  }

  if (carregando) {
    return <PageSkeleton linhas={8} />;
  }

  return (
    <div className="modo-sessao-page">
      <Janela
        titulo="Modo sessão"
        acoes={
          <Link href="/agenda" className="btn btn-outline">
            Agenda
          </Link>
        }
      >
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
        {mensagem ? <FlashMessage kind="success">{mensagem}</FlashMessage> : null}

        {sessoes.length === 0 ? (
          <EmptyState
            titulo="Nenhuma sessão hoje"
            descricao="Agende atendimentos na agenda para usar o modo sessão."
            acao={{ rotulo: "Ir para agenda", href: "/agenda" }}
          />
        ) : (
          <div className="modo-sessao-layout">
            <aside className="modo-sessao-fila" aria-label="Sessões de hoje">
              <div className="modo-sessao-fila-header">
                <strong>Hoje · {sessoes.length} sessões</strong>
                <span>{rotuloDiaHoje(hoje)}</span>
              </div>

              <div className="modo-sessao-fila-stats">
                {rotuloResumoDia(resumo, sessoes.length).map((chip) => (
                  <span
                    key={chip.key}
                    className={`modo-sessao-stat${chip.className ? ` ${chip.className}` : ""}`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>

              <div className="modo-sessao-fila-lista">
                {sessoes.map((sessao) => {
                  const ativa = String(sessao.id) === String(sessaoAtivaId);
                  const freq = visualFrequenciaAgenda(sessao.status);
                  const concluida = sessaoConcluida(sessao);

                  return (
                    <button
                      key={sessao.id}
                      type="button"
                      className={`modo-sessao-fila-item${ativa ? " is-active" : ""}${concluida ? " is-done" : ""}`}
                      onClick={() => selecionarSessao(sessao.id!)}
                    >
                      <span className="modo-sessao-fila-item-top">
                        <span>{formatarHorario(sessao.hora)}</span>
                        {ativa ? (
                          <span className="modo-sessao-tag is-now">agora</span>
                        ) : concluida ? (
                          <span className="modo-sessao-tag is-ok">ok</span>
                        ) : null}
                      </span>
                      <strong>{sessao.paciente_nome || "Paciente"}</strong>
                      <span className={`modo-sessao-fila-status ${freq.classe}`}>
                        {freq.rotulo}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="modo-sessao-progresso">
                Progresso: {concluidas}/{sessoes.length} concluídas
              </p>
            </aside>

            {sessaoAtiva ? (
              <main className="modo-sessao-main">
                <div className="modo-sessao-main-header">
                  <div>
                    <span className="modo-sessao-eyebrow">Modo sessão</span>
                    <h2 className="modo-sessao-paciente-nome">
                      {sessaoAtiva.paciente_nome || "Paciente"}
                    </h2>
                    <p className="modo-sessao-meta">
                      Hoje · {formatarHorario(sessaoAtiva.hora)} · Sessão
                      individual
                    </p>
                  </div>
                  <div className="modo-sessao-header-acoes">
                    <Link
                      href={`/paciente/${sessaoAtiva.paciente_id}`}
                      className="btn btn-outline"
                    >
                      Abrir ficha
                    </Link>
                    <Link
                      href={`/sessao/${sessaoAtiva.id}`}
                      className="btn btn-outline"
                    >
                      Sessão completa
                    </Link>
                  </div>
                </div>

                {carregandoEvolucoes ? (
                  <p className="empty-text">Carregando contexto clínico…</p>
                ) : ultimaClinica ? (
                  <section className="modo-sessao-contexto">
                    <div className="modo-sessao-contexto-header">
                      <strong>Última evolução</strong>
                      <span>
                        {ultimaClinica.data
                          ? formatarDataPaciente(String(ultimaClinica.data))
                          : "—"}
                      </span>
                    </div>
                    <div className="modo-sessao-contexto-grid">
                      {resumoCampoEvolucao(ultimaClinica.queixa) ? (
                        <div className="modo-sessao-campo">
                          <span>Queixa</span>
                          <p>{resumoCampoEvolucao(ultimaClinica.queixa)}</p>
                        </div>
                      ) : null}
                      {resumoCampoEvolucao(ultimaClinica.objetivo) ? (
                        <div className="modo-sessao-campo">
                          <span>Objetivo</span>
                          <p>{resumoCampoEvolucao(ultimaClinica.objetivo)}</p>
                        </div>
                      ) : null}
                      {resumoCampoEvolucao(ultimaClinica.plano) ? (
                        <div className="modo-sessao-campo modo-sessao-campo-full">
                          <span>Plano</span>
                          <p>{resumoCampoEvolucao(ultimaClinica.plano)}</p>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : (
                  <p className="modo-sessao-sem-contexto">
                    Sem evolução clínica anterior registrada para este paciente.
                  </p>
                )}

                <section className="modo-sessao-status">
                  <strong>Comparecimento</strong>
                  <div className="modo-sessao-status-btns">
                    <button
                      type="button"
                      className={`btn btn-outline${visualFrequenciaAgenda(sessaoAtiva.status).classe === "is-present" ? " is-active" : ""}`}
                      disabled={salvando}
                      onClick={() => void aplicarStatus("Presente")}
                    >
                      Presente
                    </button>
                    <button
                      type="button"
                      className={`btn btn-outline${visualFrequenciaAgenda(sessaoAtiva.status).classe === "is-absent" ? " is-active" : ""}`}
                      disabled={salvando}
                      onClick={() => void aplicarStatus("Faltou")}
                    >
                      Faltou
                    </button>
                    <button
                      type="button"
                      className={`btn btn-outline${isStatusCancelada(sessaoAtiva.status) ? " is-active" : ""}`}
                      disabled={salvando}
                      onClick={() => void aplicarStatus("Cancelada")}
                    >
                      Cancelada
                    </button>
                  </div>
                </section>

                <section className="modo-sessao-registro">
                  <div className="modo-sessao-registro-header">
                    <strong>Registro desta sessão</strong>
                    <span>{salvando ? "Salvando…" : "Salva automaticamente"}</span>
                  </div>
                  <RichTextEditor
                    value={registro}
                    onChange={setRegistro}
                    placeholder="Anotações da sessão, evolução clínica, plano para o próximo encontro…"
                    editorLabel="Registro desta sessão"
                  />
                </section>

                <div className="modo-sessao-acoes">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={salvando}
                    onClick={() => void concluirEProxima()}
                  >
                    Concluir e próxima
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={salvando}
                    onClick={() => void salvarRegistro(false)}
                  >
                    Salvar e ficar
                  </button>
                  <Link
                    href={`/paciente/${sessaoAtiva.paciente_id}`}
                    className="btn btn-outline"
                  >
                    Gerar documento
                  </Link>
                </div>
              </main>
            ) : null}
          </div>
        )}
      </Janela>
    </div>
  );
}
