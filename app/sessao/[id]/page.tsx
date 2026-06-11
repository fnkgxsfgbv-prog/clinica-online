"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { getCurrentUser } from "../../lib/auth";
import { requireUserClient } from "../../lib/require-user-client";
import {
  deleteFrequenciaPorSessao,
  salvarFrequenciaDaSessao,
} from "../../lib/db/frequencia";
import {
  getSessaoById,
  updateSessao,
} from "../../lib/db/sessoes";
import {
  insertEvolucao,
  listEvolucoesPorPacientePorId,
  updateEvolucao,
} from "../../lib/db/evolucoes";
import { getPlanoTerapeuticoPorPaciente } from "../../lib/db/plano-terapeutico";
import {
  planoTerapeuticoTemConteudo,
} from "../../lib/resumo-texto-clinico";
import Janela from "../../components/Janela";
import FlashMessage from "../../components/FlashMessage";
import RichTextEditor, {
  pareceHtml,
  sanitizarHtmlBasico,
} from "../../components/RichTextEditor";
import {
  dataIsoHoje,
  formatarDataHoraSessao,
  formatarDataPaciente,
} from "../../lib/datas-paciente";
import { ordenarCronologico } from "../../lib/ordenar-datas";
import { toFiniteNumberId } from "../../lib/id";
import EvolucaoHistoricoCard from "../../components/EvolucaoHistoricoCard";
import EmptyState from "../../components/ui/EmptyState";
import { PageSkeleton } from "../../components/ui/Skeleton";
import type { Evolucao, PacientePlanoTerapeutico, Sessao } from "../../types";

type AbaRegistroSessao =
  | "pre-sessao"
  | "anotacoes"
  | "observacoes"
  | "evolucao-clinica"
  | "plano-vigente";

export default function SessaoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modoAnotacoes = searchParams.get("modo") === "anotacoes";
  const modoEvolucao = searchParams.get("modo") === "evolucao";
  const idParam = params.id;
  const id =
    typeof idParam === "string"
      ? idParam
      : Array.isArray(idParam)
        ? idParam[0] ?? ""
        : "";

  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);

  const [queixa, setQueixa] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [intervencao, setIntervencao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [preSessao, setPreSessao] = useState("");
  const [anotacoesSessao, setAnotacoesSessao] = useState("");
  const [observacoesSessao, setObservacoesSessao] = useState("");
  const [abaRegistro, setAbaRegistro] =
    useState<AbaRegistroSessao>("pre-sessao");
  const [anotacoesInicializadas, setAnotacoesInicializadas] = useState(false);
  const [evolucoesCarregadas, setEvolucoesCarregadas] = useState(false);
  const [plano, setPlano] = useState("");
  const [encaminhamentos, setEncaminhamentos] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [abrirReagendar, setAbrirReagendar] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [planoTerapeutico, setPlanoTerapeutico] = useState("");
  const [planoTerapeuticoCarregado, setPlanoTerapeuticoCarregado] = useState(false);
  const ultimoSnapshotAnotacoesRef = useRef("");
  const salvandoAnotacoesRef = useRef(false);
  const salvarNovamenteDepoisRef = useRef(false);
  const salvamentoAnotacoesPromiseRef = useRef<Promise<void> | null>(null);
  const sessaoRef = useRef<Sessao | null>(null);
  const evolucoesRef = useRef<Evolucao[]>([]);
  const preSessaoRef = useRef("");
  const anotacoesSessaoRef = useRef("");
  const observacoesSessaoRef = useRef("");

  useEffect(() => {
    sessaoRef.current = sessao;
  }, [sessao]);

  useEffect(() => {
    evolucoesRef.current = evolucoes;
  }, [evolucoes]);

  useEffect(() => {
    preSessaoRef.current = preSessao;
  }, [preSessao]);

  useEffect(() => {
    anotacoesSessaoRef.current = anotacoesSessao;
  }, [anotacoesSessao]);

  useEffect(() => {
    observacoesSessaoRef.current = observacoesSessao;
  }, [observacoesSessao]);

  useEffect(() => {
    void carregarSessao();
    // carregarSessao deve reagir apenas à troca do id da sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (sessao?.paciente_id) {
      void carregarEvolucoes();
      void carregarPlanoTerapeutico();
    }
    // carregarEvolucoes e carregarPlanoTerapeutico devem rodar quando a sessão carregada muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao]);

  useEffect(() => {
    setPlanoTerapeutico("");
    setPlanoTerapeuticoCarregado(false);
  }, [sessao?.id]);

  useEffect(() => {
    if (modoAnotacoes) setAbaRegistro("anotacoes");
    else if (modoEvolucao) setAbaRegistro("evolucao-clinica");
  }, [modoAnotacoes, modoEvolucao]);

  useEffect(() => {
    setAnotacoesInicializadas(false);
    setPreSessao("");
    setAnotacoesSessao("");
    setObservacoesSessao("");
  }, [sessao?.id]);

  useEffect(() => {
    if (!sessao || anotacoesInicializadas || !evolucoesCarregadas) return;

    const anotacaoDaSessao = obterRegistroAnotacoesSessao(
      evolucoes,
      sessao.id
    );
    const rascunho = lerRascunhoAnotacoes(sessao.id);
    const preSessaoSalva = anotacaoDaSessao?.objetivo || "";
    const anotacoesSalvas = anotacaoDaSessao?.observacoes || "";
    const observacoesSalvas = anotacaoDaSessao?.plano || "";
    const snapshotSalvo = snapshotAnotacoesSessao(
      preSessaoSalva,
      anotacoesSalvas,
      observacoesSalvas
    );
    const snapshotRascunho = rascunho
      ? snapshotAnotacoesSessao(
          rascunho.preSessao,
          rascunho.anotacoesSessao,
          rascunho.observacoesSessao
        )
      : "";

    if (rascunho && snapshotRascunho && snapshotRascunho !== snapshotSalvo) {
      setPreSessao(rascunho.preSessao);
      setAnotacoesSessao(rascunho.anotacoesSessao);
      setObservacoesSessao(rascunho.observacoesSessao);
      ultimoSnapshotAnotacoesRef.current = snapshotSalvo;
    } else {
      setPreSessao(preSessaoSalva);
      setAnotacoesSessao(anotacoesSalvas);
      setObservacoesSessao(observacoesSalvas);
      ultimoSnapshotAnotacoesRef.current = snapshotSalvo;
    }

    setAnotacoesInicializadas(true);
  }, [anotacoesInicializadas, evolucoes, evolucoesCarregadas, sessao]);

  useEffect(() => {
    if (!sessao || !anotacoesInicializadas || !evolucoesCarregadas) return;

    const snapshotAtual = snapshotAnotacoesSessao(
      preSessao,
      anotacoesSessao,
      observacoesSessao
    );
    if (!temConteudoAnotacoes(preSessao, anotacoesSessao, observacoesSessao)) {
      return;
    }
    if (snapshotAtual === ultimoSnapshotAnotacoesRef.current) return;

    const timer = window.setTimeout(() => {
      void salvarAnotacoesSessao(true);
    }, 650);

    return () => window.clearTimeout(timer);
    // salvarAnotacoesSessao usa o estado atual da sessão e das evoluções.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    anotacoesInicializadas,
    anotacoesSessao,
    evolucoesCarregadas,
    observacoesSessao,
    preSessao,
    sessao?.id,
  ]);

  useEffect(() => {
    if (!sessao || !anotacoesInicializadas || !evolucoesCarregadas) return;

    const snapshotAtual = snapshotAnotacoesSessao(
      preSessao,
      anotacoesSessao,
      observacoesSessao
    );

    if (
      snapshotAtual !== ultimoSnapshotAnotacoesRef.current &&
      temConteudoAnotacoes(preSessao, anotacoesSessao, observacoesSessao)
    ) {
      salvarRascunhoAnotacoes(sessao.id, {
        preSessao,
        anotacoesSessao,
        observacoesSessao,
      });
    }
  }, [
    anotacoesInicializadas,
    anotacoesSessao,
    evolucoesCarregadas,
    observacoesSessao,
    preSessao,
    sessao,
  ]);

  useEffect(() => {
    if (!sessao || !anotacoesInicializadas) return;

    function preservarRascunhoAntesDeSair() {
      const sessaoAtual = sessaoRef.current;
      if (!sessaoAtual) return;

      const dados = {
        preSessao: preSessaoRef.current,
        anotacoesSessao: anotacoesSessaoRef.current,
        observacoesSessao: observacoesSessaoRef.current,
      };

      if (
        temConteudoAnotacoes(
          dados.preSessao,
          dados.anotacoesSessao,
          dados.observacoesSessao
        )
      ) {
        salvarRascunhoAnotacoes(sessaoAtual.id, dados);
      }
    }

    window.addEventListener("pagehide", preservarRascunhoAntesDeSair);
    window.addEventListener("beforeunload", preservarRascunhoAntesDeSair);

    return () => {
      preservarRascunhoAntesDeSair();
      window.removeEventListener("pagehide", preservarRascunhoAntesDeSair);
      window.removeEventListener("beforeunload", preservarRascunhoAntesDeSair);
    };
  }, [anotacoesInicializadas, sessao]);

  function mostrarMensagem(texto: string) {
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 3000);
  }

  async function carregarSessao() {
    if (!id) {
      setErroCarga("Sessão não encontrada.");
      setCarregandoInicial(false);
      return;
    }

    setCarregandoInicial(true);
    setErroCarga("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregandoInicial(false);
      return;
    }

    const { data, error } = await getSessaoById(user.id, id);

    if (error) {
      setErroCarga("Erro ao carregar sessão: " + error.message);
      setSessao(null);
      setCarregandoInicial(false);
      return;
    }

    if (!data) {
      setErroCarga("Sessão não encontrada.");
      setSessao(null);
      setCarregandoInicial(false);
      return;
    }

    setSessao(data as Sessao);
    setCarregandoInicial(false);
  }

  async function carregarPlanoTerapeutico() {
    if (!sessao?.paciente_id) return;

    setPlanoTerapeuticoCarregado(false);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setPlanoTerapeuticoCarregado(true);
      return;
    }

    const { data, error } = await getPlanoTerapeuticoPorPaciente(
      user.id,
      sessao.paciente_id
    );

    if (error) {
      setPlanoTerapeutico("");
      setPlanoTerapeuticoCarregado(true);
      return;
    }

    const registro = (data || null) as PacientePlanoTerapeutico | null;
    setPlanoTerapeutico(registro?.conteudo || "");
    setPlanoTerapeuticoCarregado(true);
  }

  async function carregarEvolucoes() {
    if (!sessao?.paciente_id) return;

    setEvolucoesCarregadas(false);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setEvolucoesCarregadas(true);
      return;
    }

    const { data, error } = await listEvolucoesPorPacientePorId(
      user.id,
      sessao.paciente_id
    );

    if (error) {
      mostrarMensagem("Erro ao carregar evoluções: " + error.message);
      setEvolucoesCarregadas(true);
      return;
    }

    setEvolucoes((data || []) as Evolucao[]);
    setEvolucoesCarregadas(true);
  }

  async function atualizarStatus(novoStatus: string) {
    if (!sessao) return;

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await updateSessao(user.id, Number(sessao.id), {
      status: novoStatus,
    });

    if (error) {
      mostrarMensagem(
        "Erro ao atualizar status: " + error.message
      );
      return;
    }

    const { error: frequenciaError } = await salvarFrequenciaDaSessao(
      user.id,
      sessao,
      novoStatus
    );

    if (frequenciaError) {
      mostrarMensagem(
        "Erro ao atualizar frequência: " + frequenciaError.message
      );
      return;
    }

    if (novoStatus === "Cancelada") {
      router.push("/agenda");
      return;
    }

    mostrarMensagem(
      `Sessão marcada como ${novoStatus}.`
    );

    void carregarSessao();
  }

  async function reagendarSessao() {
    if (!sessao || !novaData || !novaHora) {
      mostrarMensagem("Informe a nova data e o novo horário.");
      return;
    }

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await updateSessao(user.id, Number(id), {
      data: novaData,
      hora: novaHora,
      status: "Agendada",
    });

    if (error) {
      mostrarMensagem("Erro ao reagendar: " + error.message);
      return;
    }

    await deleteFrequenciaPorSessao(user.id, Number(id));

    setAbrirReagendar(false);

    mostrarMensagem("Sessão reagendada com sucesso.");

    void carregarSessao();
  }
  async function salvarEvolucao() {
    if (!sessao) return;

    await salvarAnotacoesSessao(true);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const sessaoIdNumero = toFiniteNumberId(sessao.id);
    const pacienteIdNumero = toFiniteNumberId(sessao.paciente_id);
    if (sessaoIdNumero == null || pacienteIdNumero == null) {
      mostrarMensagem(
        "Erro ao salvar evolução: sessão ou paciente inválido. Atualize a página e tente novamente."
      );
      return;
    }

    const { error } = await insertEvolucao({
      user_id: user.id,
      sessao_id: sessaoIdNumero,
      paciente_id: pacienteIdNumero,
      data: dataIsoHoje(),
      queixa,
      objetivo,
      intervencao,
      observacoes,
      plano,
      encaminhamentos,
    });

    if (error) {
      mostrarMensagem("Erro ao salvar evolução: " + error.message);
      return;
    }

    setQueixa("");
    setObjetivo("");
    setIntervencao("");
    setObservacoes("");
    setPlano("");
    setEncaminhamentos("");

    mostrarMensagem("Evolução salva com sucesso.");
    void carregarEvolucoes();
  }

  async function salvarAnotacoesSessao(silencioso = false) {
    if (salvamentoAnotacoesPromiseRef.current) {
      salvarNovamenteDepoisRef.current = true;
      await salvamentoAnotacoesPromiseRef.current;
      if (!salvarNovamenteDepoisRef.current) return;
    }

    const sessaoAtual = sessaoRef.current;
    if (!sessaoAtual) return;

    const preSessaoAtualTela = preSessaoRef.current;
    const anotacoesSessaoAtualTela = anotacoesSessaoRef.current;
    const observacoesSessaoAtualTela = observacoesSessaoRef.current;

    if (
      !temConteudoAnotacoes(
        preSessaoAtualTela,
        anotacoesSessaoAtualTela,
        observacoesSessaoAtualTela
      )
    ) {
      if (!silencioso) {
        mostrarMensagem("Escreva alguma informação antes de salvar.");
      }
      return;
    }

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const executarSalvamento = async () => {
      salvandoAnotacoesRef.current = true;

      const registroAtual = obterRegistroAnotacoesSessao(
        evolucoesRef.current,
        sessaoAtual.id
      );
      const preSessaoAtual = conteudoOuAnterior(
        preSessaoAtualTela,
        registroAtual?.objetivo
      );
      const anotacoesAtuais = conteudoOuAnterior(
        anotacoesSessaoAtualTela,
        registroAtual?.observacoes
      );
      const observacoesAtuais = conteudoOuAnterior(
        observacoesSessaoAtualTela,
        registroAtual?.plano
      );
      const pacienteIdNumero = toFiniteNumberId(sessaoAtual.paciente_id);
      if (pacienteIdNumero == null) {
        mostrarMensagem(
          "Erro ao salvar anotação: paciente inválido nesta sessão. Atualize a página e tente novamente."
        );
        return;
      }
      const payload = {
        user_id: user.id,
        sessao_id: Number(sessaoAtual.id),
        paciente_id: pacienteIdNumero,
        data: dataIsoHoje(),
        status_sessao: "anotacoes_sessao",
        queixa: "",
        objetivo: preSessaoAtual,
        intervencao: "",
        observacoes: anotacoesAtuais,
        plano: observacoesAtuais,
        encaminhamentos: "",
      };

      const { error } = registroAtual?.id
        ? await updateEvolucao(user.id, registroAtual.id, payload)
        : await insertEvolucao(payload);

      if (error) {
        mostrarMensagem("Erro ao salvar anotação: " + error.message);
        return;
      }

      ultimoSnapshotAnotacoesRef.current = snapshotAnotacoesSessao(
        preSessaoAtual,
        anotacoesAtuais,
        observacoesAtuais
      );
      removerRascunhoAnotacoes(sessaoAtual.id);
      setPreSessao(preSessaoAtual);
      setAnotacoesSessao(anotacoesAtuais);
      setObservacoesSessao(observacoesAtuais);

      if (!silencioso) {
        mostrarMensagem("Anotações da sessão salvas.");
      }

      void carregarEvolucoes();
    };

    salvarNovamenteDepoisRef.current = false;
    salvamentoAnotacoesPromiseRef.current = executarSalvamento();
    await salvamentoAnotacoesPromiseRef.current;
    salvamentoAnotacoesPromiseRef.current = null;
    salvandoAnotacoesRef.current = false;

    if (salvarNovamenteDepoisRef.current) {
      salvarNovamenteDepoisRef.current = false;
      await salvarAnotacoesSessao(true);
    }
  }

  if (carregandoInicial) {
    return <PageSkeleton linhas={8} />;
  }

  if (erroCarga) {
    return (
      <div>
        <Janela titulo="Sessão Clínica">
          <FlashMessage kind="error">{erroCarga}</FlashMessage>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => router.push("/agenda")}
          >
            Voltar à agenda
          </button>
        </Janela>
      </div>
    );
  }

  if (!sessao) {
    return (
      <div>
        <Janela titulo="Sessão Clínica">
          <EmptyState
            titulo="Sessão não encontrada"
            descricao="Não foi possível exibir esta sessão. Ela pode ter sido removida."
            icone="⚠"
            acao={{ rotulo: "Voltar à agenda", href: "/agenda" }}
          />
        </Janela>
      </div>
    );
  }

  return (
    <div className="session-detail-page">
      {!modoAnotacoes ? (
        <Janela titulo="Sessão Clínica">
          <div className="session-hero-card">
            <div>
              <span className="patient-status-pill">Sessão clínica</span>
              <h1 className="patient-record-title">
                {sessao.paciente_nome}
              </h1>
              <p className="patient-muted">
                {formatarDataHoraSessao(sessao.data, sessao.hora)}
              </p>
            </div>
            <div className="patient-quick-grid">
              <div>
                <span>Status</span>
                <strong>{sessao.status || "Agendada"}</strong>
              </div>
              <div>
                <span>Valor</span>
                <strong>R$ {Number(sessao.valor || 0).toFixed(2).replace(".", ",")}</strong>
              </div>
            </div>
          </div>

          <div className="session-actions">
            <button
              type="button"
              className="btn btn-green"
              onClick={() => void atualizarStatus("Presente")}
            >
              Presente
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void atualizarStatus("Faltou")}
            >
              Faltou
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void atualizarStatus("Cancelada")}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setAbrirReagendar(!abrirReagendar)}
            >
              Reagendar
            </button>
          </div>

          {abrirReagendar ? (
            <div className="session-reschedule-grid">
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />

              <input
                type="time"
                value={novaHora}
                onChange={(e) => setNovaHora(e.target.value)}
              />

              <button
                type="button"
                className="btn btn-green"
                onClick={() => void reagendarSessao()}
              >
                Salvar
              </button>
            </div>
          ) : null}
          {mensagem && (
            <FlashMessage kind="success">{mensagem}</FlashMessage>
          )}
        </Janela>
      ) : null}

      <Janela titulo="Registro da sessão">
        {modoAnotacoes ? (
          <div className="session-notes-focus-header">
            <div>
              <span className="patient-status-pill">Registro da sessão</span>
              <strong>{sessao.paciente_nome}</strong>
              <p>{formatarDataHoraSessao(sessao.data, sessao.hora)}</p>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={async () => {
                await salvarAnotacoesSessao(true);
                router.push("/agenda");
              }}
            >
              Voltar à agenda
            </button>
          </div>
        ) : null}
        {modoAnotacoes && mensagem ? (
          <FlashMessage kind="success">{mensagem}</FlashMessage>
        ) : null}
        <div className="session-notes-workspace">
          <aside className="session-notes-sidebar" aria-label="Abas do registro da sessão">
            <button
              type="button"
              className={abaRegistro === "pre-sessao" ? "is-active" : ""}
              onClick={() => setAbaRegistro("pre-sessao")}
            >
              Pré-sessão
            </button>
            <button
              type="button"
              className={abaRegistro === "anotacoes" ? "is-active" : ""}
              onClick={() => setAbaRegistro("anotacoes")}
            >
              Anotações
            </button>
            <button
              type="button"
              className={abaRegistro === "observacoes" ? "is-active" : ""}
              onClick={() => setAbaRegistro("observacoes")}
            >
              Observações
            </button>
            <button
              type="button"
              className={abaRegistro === "evolucao-clinica" ? "is-active" : ""}
              onClick={() => setAbaRegistro("evolucao-clinica")}
            >
              Evolução clínica
            </button>
            <button
              type="button"
              className={abaRegistro === "plano-vigente" ? "is-active" : ""}
              onClick={() => setAbaRegistro("plano-vigente")}
            >
              Plano terapêutico
            </button>
          </aside>

          <section className="session-notes-editor">
            <div className="session-notes-header">
              <div>
                <strong>{rotuloAbaRegistro(abaRegistro)}</strong>
                {abaRegistro === "evolucao-clinica" ? (
                  <p>Esta aba será salva no histórico de evolução do paciente.</p>
                ) : null}
                {abaRegistro === "plano-vigente" ? (
                  <p>Plano cadastrado na ficha do paciente — consulte durante o atendimento.</p>
                ) : null}
              </div>
              {abaRegistro === "plano-vigente" ? (
                sessao?.paciente_id ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      router.push(`/paciente/${sessao.paciente_id}?aba=plano`)
                    }
                  >
                    {planoTerapeuticoTemConteudo(planoTerapeutico)
                      ? "Editar plano"
                      : "Cadastrar plano"}
                  </button>
                ) : null
              ) : (
                <button
                  type="button"
                  className="btn btn-green"
                  onClick={() =>
                    abaRegistro === "evolucao-clinica"
                      ? void salvarEvolucao()
                      : void salvarAnotacoesSessao()
                  }
                >
                  {abaRegistro === "evolucao-clinica"
                    ? "Salvar evolução"
                    : "Salvar anotações"}
                </button>
              )}
            </div>

            {abaRegistro === "plano-vigente" ? (
              !planoTerapeuticoCarregado ? (
                <p className="session-plano-empty session-plano-view-empty">
                  Carregando plano...
                </p>
              ) : planoTerapeuticoTemConteudo(planoTerapeutico) ? (
                <div
                  className="session-plano-view rich-text-output"
                  dangerouslySetInnerHTML={{
                    __html: sanitizarHtmlBasico(planoTerapeutico),
                  }}
                />
              ) : (
                <EmptyState
                  compact
                  inline
                  titulo="Nenhum plano cadastrado"
                  descricao="Cadastre o plano terapêutico na ficha do paciente para consultá-lo aqui durante a sessão."
                  icone="📋"
                  acao={
                    sessao?.paciente_id
                      ? {
                          rotulo: "Cadastrar plano",
                          href: `/paciente/${sessao.paciente_id}?aba=plano`,
                        }
                      : undefined
                  }
                />
              )
            ) : abaRegistro === "evolucao-clinica" ? (
              <div className="session-evolution-grid session-evolution-grid-embedded">
                <CardEvolucao
                  titulo="Queixa"
                  value={queixa}
                  onChange={setQueixa}
                  placeholder="Descreva a demanda principal..."
                />

                <CardEvolucao
                  titulo="Objetivo da Sessão"
                  value={objetivo}
                  onChange={setObjetivo}
                  placeholder="Objetivos terapêuticos trabalhados..."
                />

                <CardEvolucao
                  titulo="Intervenção"
                  value={intervencao}
                  onChange={setIntervencao}
                  placeholder="Técnicas utilizadas..."
                />

                <CardEvolucao
                  titulo="Observações Clínicas"
                  value={observacoes}
                  onChange={setObservacoes}
                  placeholder="Comportamentos observados..."
                />

                <CardEvolucao
                  titulo="Plano Terapêutico"
                  value={plano}
                  onChange={setPlano}
                  placeholder="Plano para próxima sessão..."
                />

                <CardEvolucao
                  titulo="Encaminhamentos"
                  value={encaminhamentos}
                  onChange={setEncaminhamentos}
                  placeholder="Orientações e encaminhamentos..."
                />
              </div>
            ) : (
              <RichTextEditor
                key={abaRegistro}
                editorLabel={rotuloAbaRegistro(abaRegistro)}
                placeholder={placeholderAbaRegistro(abaRegistro)}
                value={
                  abaRegistro === "pre-sessao"
                    ? preSessao
                    : abaRegistro === "anotacoes"
                      ? anotacoesSessao
                      : observacoesSessao
                }
                onChange={(valor) => {
                  if (abaRegistro === "pre-sessao") {
                    setPreSessao(valor);
                    return;
                  }
                  if (abaRegistro === "anotacoes") {
                    setAnotacoesSessao(valor);
                    return;
                  }
                  setObservacoesSessao(valor);
                }}
              />
            )}
          </section>
        </div>
      </Janela>

      {!modoAnotacoes ? (
        <>
          <Janela titulo="Histórico do Paciente">
            {evolucoesClinicas(evolucoes).length === 0 ? (
              <EmptyState
                compact
                inline
                titulo="Nenhuma evolução registrada"
                descricao="Use o editor acima para registrar a evolução desta sessão."
                icone="📝"
              />
            ) : (
              <div className="session-history-list">
                {evolucoesClinicas(evolucoes).map((item) => (
                  <EvolucaoHistoricoCard key={item.id} evolucao={item} />
                ))}
              </div>
            )}
          </Janela>
        </>
      ) : null}
    </div>
  );
}

function CardEvolucao({
  titulo,
  value,
  onChange,
  placeholder,
}: {
  titulo: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="psico-card session-evolution-card">
      <h3>
        {titulo}
      </h3>

      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        editorLabel={titulo}
      />
    </div>
  );
}

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor?: string | null;
}) {
  if (!valor) return null;

  return (
    <div className="patient-field">
      <strong className="patient-field-title">
        {titulo}
      </strong>

      {pareceHtml(valor) ? (
        <div
          className="patient-field-text rich-text-output"
          dangerouslySetInnerHTML={{ __html: sanitizarHtmlBasico(valor) }}
        />
      ) : (
        <p className="patient-field-text">{valor}</p>
      )}
    </div>
  );
}

function obterRegistroAnotacoesSessao(
  evolucoes: Evolucao[],
  sessaoId: Sessao["id"]
) {
  return evolucoes.find(
    (item) =>
      String(item.sessao_id || "") === String(sessaoId) &&
      item.status_sessao === "anotacoes_sessao"
  );
}

function snapshotAnotacoesSessao(
  preSessao: string,
  anotacoesSessao: string,
  observacoesSessao: string
) {
  return [preSessao, anotacoesSessao, observacoesSessao].join("\n---\n");
}

function conteudoOuAnterior(atual: string, anterior?: string | null) {
  return atual.trim() ? atual : anterior || "";
}

function temConteudoAnotacoes(...valores: string[]) {
  return valores.some((valor) =>
    valor
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim()
  );
}

type RascunhoAnotacoesSessao = {
  preSessao: string;
  anotacoesSessao: string;
  observacoesSessao: string;
};

function chaveRascunhoAnotacoes(sessaoId: Sessao["id"]) {
  return `clinica-online:rascunho-anotacoes:${sessaoId}`;
}

function lerRascunhoAnotacoes(
  sessaoId: Sessao["id"]
): RascunhoAnotacoesSessao | null {
  try {
    const raw = window.localStorage.getItem(chaveRascunhoAnotacoes(sessaoId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RascunhoAnotacoesSessao>;
    return {
      preSessao: parsed.preSessao || "",
      anotacoesSessao: parsed.anotacoesSessao || "",
      observacoesSessao: parsed.observacoesSessao || "",
    };
  } catch {
    return null;
  }
}

function salvarRascunhoAnotacoes(
  sessaoId: Sessao["id"],
  dados: RascunhoAnotacoesSessao
) {
  try {
    window.localStorage.setItem(
      chaveRascunhoAnotacoes(sessaoId),
      JSON.stringify(dados)
    );
  } catch {
    // Se o navegador bloquear localStorage, o salvamento no banco continua.
  }
}

function removerRascunhoAnotacoes(sessaoId: Sessao["id"]) {
  try {
    window.localStorage.removeItem(chaveRascunhoAnotacoes(sessaoId));
  } catch {
    // Sem ação: falha de limpeza local não deve impedir o fluxo clínico.
  }
}

function evolucoesClinicas(evolucoes: Evolucao[]) {
  return ordenarCronologico(
    evolucoes.filter((item) => item.status_sessao !== "anotacoes_sessao"),
    (e) => ({ data: e.data }),
    "asc"
  );
}

function rotuloAbaRegistro(aba: AbaRegistroSessao) {
  if (aba === "pre-sessao") return "Pré-sessão";
  if (aba === "observacoes") return "Observações";
  if (aba === "evolucao-clinica") return "Evolução clínica";
  if (aba === "plano-vigente") return "Plano terapêutico";
  return "Anotações";
}

function placeholderAbaRegistro(
  aba: Exclude<AbaRegistroSessao, "evolucao-clinica" | "plano-vigente">
) {
  if (aba === "pre-sessao") {
    return "Escreva o planejamento, tema ou preparação para esta sessão...";
  }
  if (aba === "observacoes") {
    return "Escreva observações gerais sobre a sessão...";
  }
  return "Escreva as anotações clínicas desta sessão...";
}
