"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AnamneseSection from "./AnamneseSection";
import FlashMessage from "../../components/FlashMessage";
import Janela from "../../components/Janela";
import { getCurrentUser } from "../../lib/auth";
import { extrairDadosClinicaDeUsuario } from "../../lib/dados-clinica";
import { formatarCidParaExibicao } from "../../lib/cid-psicologia";
import {
  formatarDataPaciente,
  formatarNascimentoComIdade,
  obterDataPrimeiraSessao,
} from "../../lib/datas-paciente";
import { getPacienteById } from "../../lib/db/pacientes";
import {
  criarUrlDownloadDocumento,
  deleteDocumentoPaciente,
  listDocumentosPorPaciente,
  renameDocumentoPaciente,
  salvarBlobComoDocumentoPaciente,
  substituirDocumentoPaciente,
  uploadDocumentoPaciente,
} from "../../lib/db/documentos";
import { baixarUrl } from "../../lib/download";
import { prepararVisualizacaoDocumento } from "../../lib/documento-visualizacao";
import type { VisualizacaoDocumento } from "../../lib/documento-visualizacao";
import VisualizadorDocumentoModal from "../../components/VisualizadorDocumentoModal";
import EvolucaoHistoricoCard from "../../components/EvolucaoHistoricoCard";
import { listEvolucoesPorPacientePorId } from "../../lib/db/evolucoes";
import { listDocumentoModelos } from "../../lib/db/modelos";
import { listSessoesPorPaciente } from "../../lib/db/sessoes";
import { ordenarCronologico } from "../../lib/ordenar-datas";
import { extrairDataInicioAtendimento } from "../../lib/paciente-metadata";
import { requireUserClient } from "../../lib/require-user-client";
import type {
  DocumentoModelo,
  Evolucao,
  Paciente,
  PacienteDocumento,
  Sessao,
} from "../../types";

type SessaoLista = Sessao & { rotuloDataHora: string };

/** Formata data da sessão em DD/MM/AAAA (evita exibir ISO AAAA-MM-DD na UI). */
function rotuloDataHoraSessao(
  data: Sessao["data"] | unknown,
  hora?: string | null
): string {
  const texto = data == null ? "" : String(data).trim();
  if (!texto) return "Data não informada";

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  let dia: string;
  let mes: string;
  let ano: string;

  if (iso) {
    ano = iso[1];
    mes = iso[2];
    dia = iso[3];
  } else if (br) {
    dia = br[1];
    mes = br[2];
    ano = br[3];
  } else {
    return texto;
  }

  const dataPt = `${dia}/${mes}/${ano}`;
  const h = String(hora ?? "").trim();
  return h ? `${dataPt} às ${h}` : dataPt;
}

function enriquecerSessoes(lista: Sessao[]): SessaoLista[] {
  return lista.map((sessao) => ({
    ...sessao,
    rotuloDataHora: rotuloDataHoraSessao(sessao.data, sessao.hora),
  }));
}

export default function PacientePage() {
  const router = useRouter();
  const params = useParams();

  const idPaciente = useMemo(() => {
    const raw = params.id;
    const n =
      typeof raw === "string"
        ? Number(raw)
        : Array.isArray(raw)
          ? Number(raw[0] ?? "")
          : Number.NaN;
    return Number.isFinite(n) ? n : Number.NaN;
  }, [params.id]);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [sessoes, setSessoes] = useState<SessaoLista[]>([]);
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [documentos, setDocumentos] = useState<PacienteDocumento[]>([]);
  const [documentoEditando, setDocumentoEditando] =
    useState<PacienteDocumento | null>(null);
  const [novoNomeDocumento, setNovoNomeDocumento] = useState("");
  const [substitutoDocumento, setSubstitutoDocumento] = useState<File | null>(null);
  const [salvandoEdicaoDocumento, setSalvandoEdicaoDocumento] = useState(false);
  const [documentoModelos, setDocumentoModelos] = useState<DocumentoModelo[]>([]);
  const [documentoModeloSelecionado, setDocumentoModeloSelecionado] = useState("");
  const [aba, setAba] = useState("sessoes");
  const [carregando, setCarregando] = useState(true);
  const [enviandoDocumento, setEnviandoDocumento] = useState(false);
  const [gerandoDocumento, setGerandoDocumento] = useState(false);
  const [erro, setErro] = useState("");
  const [avisoCarga, setAvisoCarga] = useState("");
  const [mensagemDocumento, setMensagemDocumento] = useState("");
  const [visualizacaoDocumento, setVisualizacaoDocumento] =
    useState<VisualizacaoDocumento | null>(null);
  const [abrindoDocumento, setAbrindoDocumento] = useState(false);
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");
    setAvisoCarga("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data: pacienteData, error: pacienteError } =
      await getPacienteById(user.id, idPaciente);

    if (pacienteError || !pacienteData) {
      setErro(
        "Erro ao carregar paciente: " +
          (pacienteError?.message || "não encontrado")
      );
      setPaciente(null);
      setCarregando(false);
      return;
    }

    setPaciente(pacienteData as Paciente);

    const [sessoesRes, evolucoesRes, documentosRes, documentoModelosRes] =
      await Promise.all([
        listSessoesPorPaciente(user.id, idPaciente),
        listEvolucoesPorPacientePorId(user.id, idPaciente),
        listDocumentosPorPaciente(user.id, idPaciente),
        listDocumentoModelos(user.id),
      ]);

    const avisos: string[] = [];

    if (sessoesRes.error) {
      avisos.push("Não foi possível carregar as sessões: " + sessoesRes.error.message);
      setSessoes([]);
    } else {
      setSessoes(enriquecerSessoes((sessoesRes.data || []) as Sessao[]));
    }

    if (evolucoesRes.error) {
      avisos.push(
        "Não foi possível carregar as evoluções: " + evolucoesRes.error.message
      );
      setEvolucoes([]);
    } else {
      setEvolucoes((evolucoesRes.data || []) as Evolucao[]);
    }

    if (documentosRes.error) {
      avisos.push(
        "Não foi possível carregar os documentos: " +
          documentosRes.error.message
      );
      setDocumentos([]);
    } else {
      setDocumentos((documentosRes.data || []) as PacienteDocumento[]);
    }

    if (documentoModelosRes.error) {
      avisos.push(
        "Não foi possível carregar os modelos de documento: " +
          documentoModelosRes.error.message
      );
      setDocumentoModelos([]);
    } else {
      const modelos = (documentoModelosRes.data || []) as DocumentoModelo[];
      setDocumentoModelos(modelos);
      setDocumentoModeloSelecionado((atual) => atual || String(modelos[0]?.id || ""));
    }

    if (avisos.length) {
      setAvisoCarga(avisos.join(" "));
    }

    setCarregando(false);
  }, [idPaciente, router]);

  useEffect(() => {
    if (!Number.isFinite(idPaciente)) {
      setCarregando(false);
      setErro("Identificador do paciente inválido.");
      return;
    }
    void carregarDados();
  }, [carregarDados, idPaciente]);

  async function carregarDocumentos() {
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { data, error } = await listDocumentosPorPaciente(
      user.id,
      idPaciente
    );

    if (error) {
      setMensagemDocumento("Erro ao carregar documentos: " + error.message);
      return;
    }

    setDocumentos((data || []) as PacienteDocumento[]);
  }

  async function enviarDocumento(file?: File) {
    if (!file) return;

    setEnviandoDocumento(true);
    setMensagemDocumento("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setEnviandoDocumento(false);
      return;
    }

    const { error } = await uploadDocumentoPaciente({
      userId: user.id,
      pacienteId: idPaciente,
      file,
    });

    if (error) {
      setMensagemDocumento("Erro ao enviar documento: " + error.message);
      setEnviandoDocumento(false);
      return;
    }

    setMensagemDocumento("Documento enviado com sucesso.");
    await carregarDocumentos();
    setEnviandoDocumento(false);
  }

  async function gerarDocumentoProfissional() {
    const modelo = documentoModelos.find(
      (item) => String(item.id) === documentoModeloSelecionado
    );

    if (!modelo || !paciente) {
      setMensagemDocumento("Selecione um modelo de documento.");
      return;
    }

    setGerandoDocumento(true);
    setMensagemDocumento("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setGerandoDocumento(false);
      return;
    }

    const { gerarDocumentoModeloPdfBlob } = await import(
      "../../lib/pdf/documento-modelo"
    );
    const clinica = extrairDadosClinicaDeUsuario(user);
    const blob = gerarDocumentoModeloPdfBlob(modelo, paciente, clinica);
    const nomeArquivo = `${modelo.nome || "Documento"} - ${paciente.nome}.pdf`;

    const { error } = await salvarBlobComoDocumentoPaciente({
      userId: user.id,
      pacienteId: idPaciente,
      nomeArquivo,
      blob,
      contentType: "application/pdf",
    });

    if (error) {
      setMensagemDocumento("Erro ao gerar documento: " + error.message);
      setGerandoDocumento(false);
      return;
    }

    setMensagemDocumento("Documento profissional gerado com sucesso.");
    await carregarDocumentos();
    setGerandoDocumento(false);
  }

  function fecharVisualizacaoDocumento() {
    if (
      visualizacaoDocumento &&
      visualizacaoDocumento.tipo !== "formulario" &&
      visualizacaoDocumento.revogarUrl
    ) {
      visualizacaoDocumento.revogarUrl();
    }
    setVisualizacaoDocumento(null);
  }

  async function abrirDocumento(documento: PacienteDocumento) {
    setMensagemDocumento("");
    setAbrindoDocumento(true);
    setVisualizacaoDocumento(null);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setAbrindoDocumento(false);
      return;
    }

    const { data, error } = await prepararVisualizacaoDocumento({
      userId: user.id,
      pacienteId: idPaciente,
      documento,
      pacienteNome: paciente?.nome,
      pacienteDataNascimento: paciente?.data_nascimento,
    });

    setAbrindoDocumento(false);

    if (error || !data) {
      setMensagemDocumento(
        "Erro ao abrir documento: " + (error?.message || "conteúdo indisponível")
      );
      return;
    }

    setVisualizacaoDocumento(data);
  }

  async function baixarDocumento(documento: PacienteDocumento) {
    setMensagemDocumento("");

    const { data, error } = await criarUrlDownloadDocumento(documento);
    if (error || !data?.signedUrl) {
      setMensagemDocumento(
        "Erro ao baixar documento: " + (error?.message || "URL indisponível")
      );
      return;
    }

    baixarUrl(data.signedUrl, documento.nome_arquivo);
  }

  async function excluirDocumento(documento: PacienteDocumento) {
    setMensagemDocumento("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await deleteDocumentoPaciente(user.id, documento);
    if (error) {
      setMensagemDocumento("Erro ao excluir documento: " + error.message);
      return;
    }

    setMensagemDocumento("Documento excluído.");
    await carregarDocumentos();
  }

  function iniciarEdicaoDocumento(documento: PacienteDocumento) {
    setMensagemDocumento("");
    setDocumentoEditando(documento);
    setNovoNomeDocumento(documento.nome_arquivo || "");
    setSubstitutoDocumento(null);
  }

  function fecharEdicaoDocumento() {
    setDocumentoEditando(null);
    setNovoNomeDocumento("");
    setSubstitutoDocumento(null);
    setSalvandoEdicaoDocumento(false);
  }

  async function salvarEdicaoDocumento() {
    if (!documentoEditando) return;

    setMensagemDocumento("");
    setSalvandoEdicaoDocumento(true);

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setSalvandoEdicaoDocumento(false);
      return;
    }

    const nomeAtual = String(documentoEditando.nome_arquivo || "").trim();
    const nomeNovo = String(novoNomeDocumento || "").trim();

    if (nomeNovo && nomeNovo !== nomeAtual) {
      const { error } = await renameDocumentoPaciente(
        user.id,
        documentoEditando.id,
        nomeNovo
      );
      if (error) {
        setMensagemDocumento("Erro ao renomear documento: " + error.message);
        setSalvandoEdicaoDocumento(false);
        return;
      }
    }

    if (substitutoDocumento) {
      const { error } = await substituirDocumentoPaciente({
        userId: user.id,
        documento: documentoEditando,
        file: substitutoDocumento,
      });
      if (error) {
        setMensagemDocumento("Erro ao substituir arquivo: " + error.message);
        setSalvandoEdicaoDocumento(false);
        return;
      }
    }

    await carregarDocumentos();
    setMensagemDocumento("Documento atualizado.");
    fecharEdicaoDocumento();
  }

  const sessoesOrdenadas = useMemo(
    () =>
      ordenarCronologico(
        sessoes,
        (s) => ({ data: s.data, hora: s.hora }),
        "asc"
      ),
    [sessoes]
  );

  const evolucoesClinicas = useMemo(
    () =>
      ordenarCronologico(
        evolucoes.filter(
          (item) => item.status_sessao !== "anotacoes_sessao"
        ),
        (e) => ({ data: e.data }),
        "asc"
      ),
    [evolucoes]
  );

  if (carregando) {
    return (
      <p className="empty-text page-loading">
        Carregando paciente…
      </p>
    );
  }

  if (erro) {
    return (
      <div className="page-loading">
        <FlashMessage kind="error">{erro}</FlashMessage>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => router.push("/pacientes")}
        >
          Voltar aos pacientes
        </button>
      </div>
    );
  }

  if (!paciente) {
    return (
      <p className="empty-text page-loading">
        Paciente não encontrado.
      </p>
    );
  }

  const dataInicioEditada = extrairDataInicioAtendimento(paciente);
  const inicioAtendimento = dataInicioEditada
    ? formatarDataPaciente(dataInicioEditada)
    : obterDataPrimeiraSessao(sessoesOrdenadas);
  const anotacoesPorSessao = evolucoes.reduce<Record<string, Evolucao>>(
    (acc, item) => {
      if (item.status_sessao !== "anotacoes_sessao" || item.sessao_id == null) {
        return acc;
      }

      const chave = String(item.sessao_id);
      if (!acc[chave]) {
        acc[chave] = item;
      }

      return acc;
    },
    {}
  );

  return (
    <div className="patient-record-page">
      <Janela titulo="Prontuário do Paciente">
        <div className="patient-hero-card">
          <div className="patient-avatar-large">
            {paciente.nome.slice(0, 1).toUpperCase()}
          </div>

          <div className="patient-hero-content">
            <div className="patient-hero-heading">
              <div>
                <span className="patient-status-pill">Paciente ativo</span>
                <h1 className="patient-record-title">
                  {paciente.nome}
                </h1>
              </div>

              <button
                type="button"
                className="btn btn-green patient-hero-action"
                onClick={() =>
                  void (async () => {
                    const user = await getCurrentUser();
                    const { exportarProntuarioPacientePdf } = await import(
                      "../../lib/pdf/prontuario-paciente"
                    );
                    exportarProntuarioPacientePdf(
                      paciente,
                      evolucoesClinicas,
                      sessoes,
                      extrairDadosClinicaDeUsuario(user)
                    );
                  })()
                }
              >
                Gerar PDF do prontuário
              </button>
            </div>

            <div className="patient-quick-grid">
              <div>
                <span>Nascimento / idade</span>
                <strong>{formatarNascimentoComIdade(paciente.data_nascimento)}</strong>
              </div>
              <div>
                <span>Início do atendimento</span>
                <strong>{inicioAtendimento}</strong>
              </div>
              <div>
                <span>Telefone</span>
                <strong>{paciente.telefone || "Não informado"}</strong>
              </div>
              <div>
                <span>CID</span>
                <strong>{formatarCidParaExibicao(paciente.cid)}</strong>
              </div>
              <div>
                <span>Valor da sessão</span>
                <strong>
                  {paciente.valor_sessao
                    ? `R$ ${paciente.valor_sessao}`
                    : "Não informado"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </Janela>

      <Janela titulo="Central do Paciente">
        {avisoCarga ? (
          <FlashMessage kind="info">{avisoCarga}</FlashMessage>
        ) : null}

        <div className="patient-tabs-bar">
          <button
            type="button"
            className={aba === "sessoes" ? "patient-tab is-active" : "patient-tab"}
            onClick={() => setAba("sessoes")}
          >
            Sessões
            <span>{sessoes.length}</span>
          </button>

          <button
            type="button"
            className={
              aba === "evolucoes" ? "patient-tab is-active" : "patient-tab"
            }
            onClick={() => setAba("evolucoes")}
          >
            Evoluções
            <span>{evolucoesClinicas.length}</span>
          </button>

          <button
            type="button"
            className={
              aba === "documentos" ? "patient-tab is-active" : "patient-tab"
            }
            onClick={() => setAba("documentos")}
          >
            Documentos
            <span>{documentos.length}</span>
          </button>

          <button
            type="button"
            className={
              aba === "formularios" ? "patient-tab is-active" : "patient-tab"
            }
            onClick={() => setAba("formularios")}
          >
            Formulários
          </button>

          <button
            type="button"
            className="btn btn-green"
            onClick={() =>
              router.push(`/paciente/${idPaciente}/nova-evolucao`)
            }
          >
            + Registrar evolução
          </button>
        </div>

        {aba === "sessoes" && (
          <div className="session-list">
            {sessoes.length === 0 ? (
              <p className="empty-text">Nenhuma sessão registrada.</p>
            ) : (
              sessoesOrdenadas.map((s) => {
                const anotacoes = anotacoesPorSessao[String(s.id)];
                const preSessao = textoResumoAnotacao(anotacoes?.objetivo);
                const anotacaoSessao = textoResumoAnotacao(anotacoes?.observacoes);
                const observacaoSessao = textoResumoAnotacao(anotacoes?.plano);
                const temAnotacoes =
                  preSessao || anotacaoSessao || observacaoSessao;

                return (
                  <div key={s.id} className="lista-card patient-session-card">
                    <div className="patient-session-main">
                      <div>
                        <strong>
                          {(() => {
                            const t = String(s.data ?? "").trim();
                            const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
                            const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                            let dia: string;
                            let mes: string;
                            let ano: string;
                            if (iso) {
                              ano = iso[1];
                              mes = iso[2];
                              dia = iso[3];
                            } else if (br) {
                              dia = br[1];
                              mes = br[2];
                              ano = br[3];
                            } else {
                              return t || "Data não informada";
                            }
                            const dataPt = `${dia}/${mes}/${ano}`;
                            const h = String(s.hora ?? "").trim();
                            return h ? `${dataPt} às ${h}` : dataPt;
                          })()}
                        </strong>
                        <p>Status: {s.status || "Agendada"}</p>
                      </div>

                      {temAnotacoes ? (
                        <div className="patient-session-notes-preview">
                          <strong>Anotações salvas nesta sessão</strong>
                          {preSessao ? (
                            <p>
                              <span>Pré-sessão:</span> {preSessao}
                            </p>
                          ) : null}
                          {anotacaoSessao ? (
                            <p>
                              <span>Anotações:</span> {anotacaoSessao}
                            </p>
                          ) : null}
                          {observacaoSessao ? (
                            <p>
                              <span>Observações:</span> {observacaoSessao}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="patient-session-no-notes">
                          Nenhuma anotação salva nesta sessão.
                        </p>
                      )}
                    </div>

                    <div className="patient-session-actions">
                      <button
                        className="btn btn-outline"
                        onClick={() => router.push(`/sessao/${s.id}`)}
                      >
                        Abrir sessão
                      </button>
                      <button
                        className="btn btn-green"
                        onClick={() => router.push(`/sessao/${s.id}?modo=anotacoes`)}
                      >
                        Ver anotações
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {aba === "evolucoes" && (
          <div className="session-list">
            {evolucoesClinicas.length === 0 ? (
              <p className="empty-text">Nenhuma evolução registrada.</p>
            ) : (
              evolucoesClinicas.map((e) => (
                <EvolucaoHistoricoCard key={e.id} evolucao={e} />
              ))
            )}
          </div>
        )}

        {aba === "documentos" && (
          <div className="session-list">
            {mensagemDocumento ? (
              <FlashMessage kind="info">{mensagemDocumento}</FlashMessage>
            ) : null}

            <div className="psico-card patient-doc-toolbar">
              <div>
                <strong>Documentos do paciente</strong>
                <p className="patient-muted" style={{ marginBottom: 0 }}>
                  Envie arquivos ou gere documentos profissionais a partir dos
                  seus modelos.
                </p>
              </div>

              <div className="modelos-item-actions">
                <select
                  value={documentoModeloSelecionado}
                  onChange={(event) =>
                    setDocumentoModeloSelecionado(event.target.value)
                  }
                  style={{ maxWidth: "260px" }}
                >
                  <option value="">Modelo de documento...</option>
                  {documentoModelos.map((modelo) => (
                    <option key={modelo.id} value={String(modelo.id)}>
                      {modelo.nome}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={gerandoDocumento || documentoModelos.length === 0}
                  onClick={() => void gerarDocumentoProfissional()}
                >
                  {gerandoDocumento ? "Gerando..." : "+ Gerar documento"}
                </button>

                <label
                  className={`btn ${
                    enviandoDocumento ? "btn-outline" : "btn-green"
                  }`}
                  style={{
                    cursor: enviandoDocumento ? "not-allowed" : "pointer",
                    opacity: enviandoDocumento ? 0.7 : 1,
                  }}
                >
                  {enviandoDocumento ? "Enviando..." : "+ Enviar arquivo"}
                  <input
                    type="file"
                    disabled={enviandoDocumento}
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      void enviarDocumento(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {documentos.length === 0 ? (
              <p className="empty-text">Nenhum documento enviado.</p>
            ) : (
              documentos.map((doc) => (
                <div key={doc.id} className="lista-card patient-document-row">
                  <div>
                    <strong>{doc.nome_arquivo}</strong>
                    <p className="patient-muted" style={{ marginBottom: 0 }}>
                      {formatarTamanho(doc.tamanho_bytes)}
                      {doc.created_at
                        ? ` · ${formatarDataHora(doc.created_at)}`
                        : ""}
                    </p>
                  </div>

                  <div className="patient-row-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={abrindoDocumento}
                      onClick={() => void abrirDocumento(doc)}
                    >
                      {abrindoDocumento ? "Abrindo..." : "Abrir"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => void baixarDocumento(doc)}
                    >
                      Baixar
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => iniciarEdicaoDocumento(doc)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void excluirDocumento(doc)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}

            {documentoEditando ? (
              <div className="doc-viewer-overlay" role="dialog" aria-modal="true">
                <div className="doc-viewer-shell" style={{ maxWidth: 760 }}>
                  <header className="doc-viewer-toolbar">
                    <p className="doc-viewer-filename" title="Editar documento">
                      Editar documento
                    </p>
                    <div className="doc-viewer-toolbar-actions">
                      <button
                        type="button"
                        className="btn btn-outline doc-viewer-action"
                        onClick={fecharEdicaoDocumento}
                        disabled={salvandoEdicaoDocumento}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn btn-green doc-viewer-action"
                        onClick={() => void salvarEdicaoDocumento()}
                        disabled={salvandoEdicaoDocumento}
                      >
                        {salvandoEdicaoDocumento ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </header>

                  <div className="doc-viewer-stage" style={{ padding: 18 }}>
                    <div className="psico-card" style={{ margin: 0 }}>
                      <div style={{ display: "grid", gap: 14 }}>
                        <div>
                          <label className="label-form">Nome do documento</label>
                          <input
                            className="input"
                            value={novoNomeDocumento}
                            onChange={(e) => setNovoNomeDocumento(e.target.value)}
                            placeholder="Ex.: Anamnese-do-paciente.pdf"
                            disabled={salvandoEdicaoDocumento}
                          />
                          <p className="patient-muted" style={{ marginTop: 6, marginBottom: 0 }}>
                            Isso muda o nome exibido e o nome do download.
                          </p>
                        </div>

                        <div>
                          <label className="label-form">Substituir arquivo (opcional)</label>
                          <input
                            type="file"
                            disabled={salvandoEdicaoDocumento}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              e.target.value = "";
                              setSubstitutoDocumento(file);
                            }}
                          />
                          {substitutoDocumento ? (
                            <p className="patient-muted" style={{ marginTop: 6, marginBottom: 0 }}>
                              Novo arquivo selecionado: <strong>{substitutoDocumento.name}</strong>
                            </p>
                          ) : (
                            <p className="patient-muted" style={{ marginTop: 6, marginBottom: 0 }}>
                              Se você selecionar um arquivo, ele substitui o atual.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {aba === "formularios" && (
          <AnamneseSection
            pacienteId={idPaciente}
            pacienteNome={paciente.nome}
            pacienteDataNascimento={paciente.data_nascimento}
            onDocumentosChanged={carregarDocumentos}
            onAbrirDocumentos={() => setAba("documentos")}
          />
        )}
      </Janela>

      <VisualizadorDocumentoModal
        visualizacao={visualizacaoDocumento}
        carregando={abrindoDocumento}
        onFechar={fecharVisualizacaoDocumento}
      />
    </div>
  );
}

function formatarTamanho(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "Tamanho não informado";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function formatarDataHora(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function textoResumoAnotacao(valor?: string | null) {
  if (!valor) return "";

  const texto = valor
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h\d)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (texto.length <= 180) return texto;
  return `${texto.slice(0, 180).trim()}...`;
}
