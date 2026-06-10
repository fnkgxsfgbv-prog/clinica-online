"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import FlashMessage from "../components/FlashMessage";
import FormularioCamposLista from "../components/FormularioCamposLista";
import ModeloCatalogCard from "../components/ModeloCatalogCard";
import ModeloCatalogLista from "../components/ModeloCatalogLista";
import Janela from "../components/Janela";
import { PageSkeleton } from "../components/ui/Skeleton";
import RichTextEditor, {
  normalizarConteudoEditor,
  sanitizarHtmlBasico,
} from "../components/RichTextEditor";
import { getCurrentUser } from "../lib/auth";
import {
  criarCamposDeTexto,
  criarUrlDownloadModeloArquivo,
  criarUrlModeloArquivo,
  deleteDocumentoModelo,
  deleteFormularioModelo,
  deleteModeloArquivo,
  listDocumentoModelos,
  listFormularioModelos,
  listModeloArquivos,
  salvarDocumentoModelo,
  salvarFormularioModelo,
  uploadModeloArquivo,
} from "../lib/db/modelos";
import { baixarUrl } from "../lib/download";
import {
  criarFormularioModeloPronto,
  FORMULARIO_MODELOS_PRONTOS,
} from "../lib/modelos/formulario-modelos-prontos";
import { requireUserClient } from "../lib/require-user-client";
import type {
  AnamneseCampo,
  DocumentoModelo,
  FormularioModelo,
  ModeloArquivo,
} from "../types";

const DOCUMENTO_MODELOS_PRONTOS = [
  {
    nome: "Recibo",
    categoria: "Recibo",
    conteudo: `RECIBO

Recebi de {{paciente_nome}} o valor de {{valor_sessao}} referente a atendimento psicológico.

Data: {{data_hoje}}

Assinatura:`,
  },
  {
    nome: "Declaração de comparecimento",
    categoria: "Declaração",
    conteudo: `DECLARAÇÃO DE COMPARECIMENTO

Declaro, para os devidos fins, que {{paciente_nome}} compareceu a atendimento psicológico nesta data.

Data: {{data_hoje}}

Assinatura:`,
  },
  {
    nome: "Termo de consentimento",
    categoria: "Termo",
    conteudo: `TERMO DE CONSENTIMENTO

Eu, {{paciente_nome}}, declaro estar ciente das condições do acompanhamento psicológico, incluindo sigilo profissional, frequência dos atendimentos e combinados terapêuticos.

Data: {{data_hoje}}

Assinatura do paciente:

Assinatura do profissional:`,
  },
  {
    nome: "Contrato terapêutico",
    categoria: "Contrato",
    conteudo: `CONTRATO TERAPÊUTICO

Paciente: {{paciente_nome}}
Telefone: {{paciente_telefone}}
Valor da sessão: {{valor_sessao}}

Ficam estabelecidos os combinados de atendimento, frequência, cancelamentos, atrasos e demais condições acordadas entre paciente e profissional.

Data: {{data_hoje}}

Assinatura do paciente:

Assinatura do profissional:`,
  },
  {
    nome: "Relatório breve",
    categoria: "Relatório",
    conteudo: `RELATÓRIO BREVE

Paciente: {{paciente_nome}}
CID: {{paciente_cid}}
Data: {{data_hoje}}

Resumo da demanda:

Observações clínicas:

Encaminhamentos:`,
  },
];

const VARIAVEIS_DOCUMENTO = [
  ["{{paciente_nome}}", "Nome do paciente"],
  ["{{paciente_telefone}}", "Telefone do paciente"],
  ["{{paciente_cid}}", "CID cadastrado"],
  ["{{data_hoje}}", "Data em que o documento for gerado"],
  ["{{valor_sessao}}", "Valor da sessão do paciente"],
];

function gerarPreviaDocumento(conteudo: string) {
  return sanitizarHtmlBasico(normalizarConteudoEditor(conteudo))
    .replaceAll("{{paciente_nome}}", "Maria Silva")
    .replaceAll("{{paciente_telefone}}", "(11) 99999-9999")
    .replaceAll("{{paciente_cid}}", "F41.1")
    .replaceAll("{{data_hoje}}", new Intl.DateTimeFormat("pt-BR").format(new Date()))
    .replaceAll("{{valor_sessao}}", "R$ 150");
}

function criarCampoInicial(): AnamneseCampo {
  return {
    id: crypto.randomUUID(),
    titulo: "Nova pergunta",
    placeholder: "Digite uma orientação para esta pergunta...",
    resposta: "",
  };
}

function rotuloPerguntas(quantidade: number) {
  return quantidade === 1 ? "1 pergunta" : `${quantidade} perguntas`;
}

async function lerArquivoTexto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default function ModelosPage() {
  const router = useRouter();
  const [aba, setAba] = useState<"documentos" | "formularios">("documentos");
  const [documentos, setDocumentos] = useState<DocumentoModelo[]>([]);
  const [formularios, setFormularios] = useState<FormularioModelo[]>([]);
  const [arquivos, setArquivos] = useState<ModeloArquivo[]>([]);
  const [documentoAtual, setDocumentoAtual] = useState<Partial<DocumentoModelo>>({});
  const [documentoView, setDocumentoView] = useState<"inicio" | "editor">("inicio");
  const [mostrarPrevia, setMostrarPrevia] = useState(false);
  const [formularioAtual, setFormularioAtual] = useState<Partial<FormularioModelo>>({});
  const [formularioView, setFormularioView] = useState<"inicio" | "editor">("inicio");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const [docsRes, formsRes, arquivosRes] = await Promise.all([
      listDocumentoModelos(user.id),
      listFormularioModelos(user.id),
      listModeloArquivos(user.id),
    ]);

    const erroCarga =
      docsRes.error?.message || formsRes.error?.message || arquivosRes.error?.message;

    if (erroCarga) {
      setErro("Erro ao carregar documentos: " + erroCarga);
      setCarregando(false);
      return;
    }

    setDocumentos((docsRes.data || []) as DocumentoModelo[]);
    setFormularios((formsRes.data || []) as FormularioModelo[]);
    setArquivos((arquivosRes.data || []) as ModeloArquivo[]);
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarDocumento() {
    if (!documentoAtual.nome?.trim()) {
      setErro("Informe o nome do modelo de documento.");
      return;
    }

    setSalvando(true);
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setSalvando(false);
      return;
    }

    const { error } = await salvarDocumentoModelo({
      userId: user.id,
      modelo: {
        id: documentoAtual.id,
        nome: documentoAtual.nome,
        categoria: documentoAtual.categoria || "Documento",
        conteudo: sanitizarHtmlBasico(
          normalizarConteudoEditor(documentoAtual.conteudo || "")
        ),
      },
    });

    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar documento: " + error.message);
      return;
    }

    setMensagem("Modelo salvo. Use na ficha do paciente → aba Documentos → Gerar documento.");
    setDocumentoView("inicio");
    setDocumentoAtual({});
    await carregar();
  }

  async function salvarFormulario() {
    if (!formularioAtual.nome?.trim()) {
      setErro("Informe o nome do formulário.");
      return;
    }

    setSalvando(true);
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setSalvando(false);
      return;
    }

    const { error } = await salvarFormularioModelo({
      userId: user.id,
      modelo: {
        id: formularioAtual.id,
        nome: formularioAtual.nome,
        descricao: formularioAtual.descricao || "",
        campos: formularioAtual.campos || [],
      },
    });

    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar formulário: " + error.message);
      return;
    }

    setMensagem("Modelo salvo. Use na ficha do paciente → Formulários.");
    setFormularioView("inicio");
    setFormularioAtual({});
    await carregar();
  }

  async function enviarArquivo(tipo: "documento" | "formulario", file?: File) {
    if (!file) return;

    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await uploadModeloArquivo({ userId: user.id, tipo, file });
    if (error) {
      setErro("Erro ao enviar arquivo: " + error.message);
      return;
    }

    setMensagem("Arquivo enviado.");
    await carregar();
  }

  async function importarFormulario(file?: File) {
    if (!file) return;

    try {
      const texto = await lerArquivoTexto(file);
      const campos = criarCamposDeTexto(texto);
      if (campos.length === 0) {
        setErro("O arquivo não tem linhas suficientes para importar.");
        return;
      }

      abrirEditorFormulario({
        nome: file.name.replace(/\.[^.]+$/, ""),
        descricao: "Importado do computador",
        campos,
      });
      setAba("formularios");
      setMensagem("Arquivo importado. Revise as perguntas e salve o modelo.");
    } catch {
      setErro("Não foi possível ler o arquivo.");
    }
  }

  async function abrirArquivo(arquivo: ModeloArquivo) {
    const { data, error } = await criarUrlModeloArquivo(arquivo);
    if (error || !data?.signedUrl) {
      setErro("Erro ao abrir arquivo: " + (error?.message || "URL indisponível"));
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function baixarArquivo(arquivo: ModeloArquivo) {
    const { data, error } = await criarUrlDownloadModeloArquivo(arquivo);
    if (error || !data?.signedUrl) {
      setErro("Erro ao baixar arquivo: " + (error?.message || "URL indisponível"));
      return;
    }

    baixarUrl(data.signedUrl, arquivo.nome_arquivo);
  }

  async function excluirArquivo(arquivo: ModeloArquivo) {
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await deleteModeloArquivo(user.id, arquivo);
    if (error) {
      setErro("Erro ao excluir arquivo: " + error.message);
      return;
    }

    setMensagem("Arquivo excluído.");
    await carregar();
  }

  async function excluirDocumento(id: string | number) {
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await deleteDocumentoModelo(user.id, id);
    if (error) {
      setErro("Erro ao excluir documento: " + error.message);
      return;
    }

    await carregar();
  }

  async function excluirFormulario(id: string | number) {
    const user = await requireUserClient(router, getCurrentUser);
    if (!user) return;

    const { error } = await deleteFormularioModelo(user.id, id);
    if (error) {
      setErro("Erro ao excluir formulário: " + error.message);
      return;
    }

    await carregar();
  }

  function atualizarCampo(
    id: string,
    chave: "titulo" | "placeholder" | "resposta",
    valor: string
  ) {
    setFormularioAtual((atual) => ({
      ...atual,
      campos: (atual.campos || []).map((campo) =>
        campo.id === id ? { ...campo, [chave]: valor } : campo
      ),
    }));
  }

  function abrirEditorDocumento(modelo: Partial<DocumentoModelo>) {
    setDocumentoAtual(modelo);
    setDocumentoView("editor");
    setMostrarPrevia(false);
    setErro("");
  }

  function novoDocumentoEmBranco() {
    abrirEditorDocumento({
      nome: "",
      categoria: "",
      conteudo: "",
    });
    setMensagem("Documento em branco. Dê um nome, escreva o texto e clique em Salvar modelo.");
  }

  function aplicarDocumentoPronto(modelo: (typeof DOCUMENTO_MODELOS_PRONTOS)[number]) {
    abrirEditorDocumento({
      ...modelo,
      conteudo: normalizarConteudoEditor(modelo.conteudo),
    });
    setMensagem(`"${modelo.nome}" aberto. Revise o texto e clique em Salvar modelo.`);
  }

  function voltarInicioDocumentos() {
    setDocumentoView("inicio");
    setMostrarPrevia(false);
    setErro("");
  }

  async function salvarDocumentoProntoNaBiblioteca(
    modelo: (typeof DOCUMENTO_MODELOS_PRONTOS)[number]
  ) {
    setSalvando(true);
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setSalvando(false);
      return;
    }

    const conteudo = sanitizarHtmlBasico(normalizarConteudoEditor(modelo.conteudo));
    const existente = documentos.find((item) => item.nome === modelo.nome);

    const { error } = await salvarDocumentoModelo({
      userId: user.id,
      modelo: {
        id: existente?.id,
        nome: modelo.nome,
        categoria: modelo.categoria,
        conteudo,
      },
    });

    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar modelo: " + error.message);
      return;
    }

    setMensagem(
      `"${modelo.nome}" salvo. Na ficha do paciente: Documentos → Gerar documento.`
    );
    await carregar();
  }

  function abrirEditorFormulario(modelo: Partial<FormularioModelo>) {
    setFormularioAtual(modelo);
    setFormularioView("editor");
    setErro("");
  }

  function aplicarFormularioPronto(modelo: (typeof FORMULARIO_MODELOS_PRONTOS)[number]) {
    abrirEditorFormulario(criarFormularioModeloPronto(modelo));
    setMensagem(`"${modelo.nome}" aberto para edição.`);
  }

  function voltarInicioFormularios() {
    setFormularioView("inicio");
    setErro("");
  }

  async function salvarModeloProntoNaBiblioteca(
    modelo: (typeof FORMULARIO_MODELOS_PRONTOS)[number]
  ) {
    setSalvando(true);
    setErro("");
    setMensagem("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setSalvando(false);
      return;
    }

    const instancia = criarFormularioModeloPronto(modelo);
    const existente = formularios.find((item) => item.nome === modelo.nome);

    const { error } = await salvarFormularioModelo({
      userId: user.id,
      modelo: {
        id: existente?.id,
        nome: instancia.nome,
        descricao: instancia.descricao || "",
        campos: instancia.campos,
      },
    });

    setSalvando(false);
    if (error) {
      setErro("Erro ao restaurar modelo: " + error.message);
      return;
    }

    setMensagem(`"${modelo.nome}" adicionado à sua biblioteca.`);
    await carregar();
  }

  function novoFormularioEmBranco() {
    abrirEditorFormulario({
      nome: "",
      descricao: "",
      campos: [criarCampoInicial()],
    });
    setMensagem("Novo formulário em branco. Adicione perguntas e salve.");
  }

  const arquivosDocumento = arquivos.filter((arquivo) => arquivo.tipo === "documento");
  const arquivosFormulario = arquivos.filter((arquivo) => arquivo.tipo === "formulario");
  const previaDocumento = gerarPreviaDocumento(documentoAtual.conteudo || "");

  return (
    <div className="patients-page">
      <Janela titulo="Modelos">
        {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
        {mensagem ? <FlashMessage kind="success">{mensagem}</FlashMessage> : null}

        <div className="modelos-segmented" role="tablist" aria-label="Tipo de modelo">
          <button
            type="button"
            role="tab"
            aria-selected={aba === "documentos"}
            className={aba === "documentos" ? "btn btn-green" : "btn btn-outline"}
            onClick={() => setAba("documentos")}
          >
            Laudos e declarações
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={aba === "formularios"}
            className={aba === "formularios" ? "btn btn-green" : "btn btn-outline"}
            onClick={() => setAba("formularios")}
          >
            Anamneses
          </button>
        </div>

        {carregando ? (
          <PageSkeleton linhas={6} />
        ) : aba === "documentos" ? (
          <section className="psico-card modelos-doc-workspace">
            {documentoView === "inicio" ? (
              <div className="modelos-catalogo">
                <header className="modelos-catalogo-cabecalho">
                  <h2>Laudos e declarações</h2>
                  <p>
                    Escolha um modelo, personalize o texto e use na ficha do paciente.
                    Campos como <code>{"{{paciente_nome}}"}</code> preenchem sozinhos.
                  </p>
                </header>

                <section className="catalog-secao">
                  <h3 className="catalog-secao-titulo">Começar</h3>
                  <div className="catalog-grade">
                    <ModeloCatalogCard
                      variante="criar"
                      badge="Novo"
                      titulo="Documento em branco"
                      meta="Crie um modelo totalmente personalizado"
                      rotuloPrincipal="Criar"
                      acaoPrincipal={novoDocumentoEmBranco}
                    />
                    {DOCUMENTO_MODELOS_PRONTOS.map((modelo) => (
                      <ModeloCatalogCard
                        key={modelo.nome}
                        badge={modelo.categoria}
                        titulo={modelo.nome}
                        meta="Modelo profissional pronto para editar"
                        rotuloPrincipal="Personalizar"
                        acaoPrincipal={() => aplicarDocumentoPronto(modelo)}
                        rotuloSecundario="Salvar na biblioteca"
                        acaoSecundaria={() =>
                          void salvarDocumentoProntoNaBiblioteca(modelo)
                        }
                        desabilitado={salvando}
                      />
                    ))}
                  </div>
                </section>

                <ModeloCatalogLista
                  tituloSecao="Sua biblioteca"
                  vazio="Nenhum modelo salvo ainda."
                  itens={documentos.map((modelo) => ({
                    id: modelo.id,
                    titulo: modelo.nome,
                    meta: modelo.categoria || "Sem categoria",
                    onEditar: () => abrirEditorDocumento(modelo),
                    onExcluir: () => void excluirDocumento(modelo.id),
                  }))}
                />
              </div>
            ) : (
              <>
                <div className="modelos-doc-topbar">
                  <div>
                    <button
                      type="button"
                      className="btn btn-outline doc-voltar-btn"
                      onClick={voltarInicioDocumentos}
                    >
                      ← Biblioteca
                    </button>
                    <h2 style={{ marginTop: "12px" }}>
                      {documentoAtual.nome?.trim() || "Novo documento"}
                    </h2>
                    <p className="patient-muted">
                      Edite o texto e salve. Na ficha do paciente: Documentos → Gerar
                      documento.
                    </p>
                  </div>
                </div>

                <div className="modelos-doc-form-row">
                  <div>
                    <label className="label-form">Nome do modelo</label>
                    <input
                      value={documentoAtual.nome || ""}
                      placeholder="Ex.: Declaração de comparecimento"
                      onChange={(event) =>
                        setDocumentoAtual((atual) => ({
                          ...atual,
                          nome: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="label-form">Tipo</label>
                    <input
                      value={documentoAtual.categoria || ""}
                      placeholder="Declaração, recibo, contrato..."
                      onChange={(event) =>
                        setDocumentoAtual((atual) => ({
                          ...atual,
                          categoria: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="doc-variaveis-bloco">
                  <span className="doc-variaveis-label">
                    Inserir no texto (preenche sozinho no paciente):
                  </span>
                  <div className="modelos-variable-strip">
                    {VARIAVEIS_DOCUMENTO.map(([codigo, descricao]) => (
                      <button
                        key={codigo}
                        type="button"
                        className="modelos-variable-chip"
                        title={descricao}
                        onClick={() =>
                          setDocumentoAtual((atual) => ({
                            ...atual,
                            conteudo: `${normalizarConteudoEditor(
                              atual.conteudo || ""
                            )}<p>${codigo}</p>`,
                          }))
                        }
                      >
                        <span>{descricao}</span>
                        <code>{codigo}</code>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="label-form">Texto do documento</label>
                <RichTextEditor
                  value={documentoAtual.conteudo || ""}
                  onChange={(valor) =>
                    setDocumentoAtual((atual) => ({
                      ...atual,
                      conteudo: valor,
                    }))
                  }
                />

                <div className="doc-previa-toggle">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setMostrarPrevia((atual) => !atual)}
                  >
                    {mostrarPrevia ? "Ocultar prévia" : "Ver prévia com dados de exemplo"}
                  </button>
                </div>

                {mostrarPrevia ? (
                  <div className="modelos-preview modelos-preview-compact">
                    <div
                      className="modelos-preview-page"
                      dangerouslySetInnerHTML={{
                        __html:
                          previaDocumento ||
                          "<p>Escreva o texto para ver a prévia.</p>",
                      }}
                    />
                  </div>
                ) : null}

                <details className="doc-anexos-details">
                  <summary>Arquivos anexados (opcional)</summary>
                  <p className="patient-muted">
                    PDF ou Word de referência — não substitui o modelo editável acima.
                  </p>
                  <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                    Anexar arquivo
                    <input
                      type="file"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void enviarArquivo("documento", file);
                      }}
                    />
                  </label>
                  {arquivosDocumento.length === 0 ? (
                    <p className="modelos-doc-empty">Nenhum arquivo anexado.</p>
                  ) : (
                    arquivosDocumento.map((arquivo) => (
                      <div key={arquivo.id} className="doc-salvo-item">
                        <button
                          type="button"
                          className="doc-salvo-item-main"
                          onClick={() => void abrirArquivo(arquivo)}
                        >
                          <strong>{arquivo.nome_arquivo}</strong>
                        </button>
                        <button
                          type="button"
                          className="modelos-doc-saved-download"
                          onClick={() => void baixarArquivo(arquivo)}
                        >
                          Baixar
                        </button>
                      </div>
                    ))
                  )}
                </details>

                <div className="modelos-doc-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={voltarInicioDocumentos}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    className="btn btn-green"
                    disabled={salvando}
                    onClick={() => void salvarDocumento()}
                  >
                    {salvando ? "Salvando..." : "Salvar modelo"}
                  </button>
                </div>
              </>
            )}
          </section>
        ) : formularioView === "inicio" ? (
          <section className="psico-card modelos-doc-workspace">
            <div className="modelos-catalogo">
              <header className="modelos-catalogo-cabecalho">
                <h2>Anamneses</h2>
                <p>
                  Monte o questionário aqui. Na consulta, preencha na ficha do paciente →
                  aba Formulários.
                </p>
              </header>

              <section className="catalog-secao">
                <h3 className="catalog-secao-titulo">Modelos para autismo (TEA)</h3>
                <div className="catalog-grade">
                  <ModeloCatalogCard
                    variante="criar"
                    badge="Novo"
                    titulo="Formulário em branco"
                    meta="Monte suas próprias perguntas"
                    rotuloPrincipal="Criar"
                    acaoPrincipal={novoFormularioEmBranco}
                  />
                  {FORMULARIO_MODELOS_PRONTOS.map((modelo) => (
                    <ModeloCatalogCard
                      key={modelo.nome}
                      badge="TEA"
                      titulo={modelo.nome}
                      meta={rotuloPerguntas(modelo.campos.length)}
                      rotuloPrincipal="Personalizar"
                      acaoPrincipal={() => aplicarFormularioPronto(modelo)}
                      rotuloSecundario="Salvar na biblioteca"
                      acaoSecundaria={() => void salvarModeloProntoNaBiblioteca(modelo)}
                      desabilitado={salvando}
                    />
                  ))}
                </div>
              </section>

              <ModeloCatalogLista
                tituloSecao="Sua biblioteca"
                vazio="Nenhuma anamnese salva ainda."
                itens={formularios.map((modelo) => ({
                  id: modelo.id,
                  titulo: modelo.nome,
                  meta: rotuloPerguntas(modelo.campos?.length || 0),
                  onEditar: () => abrirEditorFormulario(modelo),
                  onExcluir: () => void excluirFormulario(modelo.id),
                }))}
              />
            </div>
          </section>
        ) : (
          <section className="psico-card modelos-doc-workspace">
            <div className="modelos-editor-shell">
              <nav className="modelos-editor-nav" aria-label="Formulários salvos">
                <button
                  type="button"
                  className="btn btn-outline doc-voltar-btn"
                  style={{ width: "100%", marginBottom: "14px" }}
                  onClick={voltarInicioFormularios}
                >
                  ← Biblioteca
                </button>
                <span className="modelos-editor-nav-titulo">Seus modelos</span>
                {formularios.map((modelo) => (
                  <button
                    key={modelo.id}
                    type="button"
                    className={`modelos-editor-nav-item${
                      formularioAtual.id === modelo.id ? " is-active" : ""
                    }`}
                    onClick={() => abrirEditorFormulario(modelo)}
                  >
                    <strong>{modelo.nome}</strong>
                    <small>{rotuloPerguntas(modelo.campos?.length || 0)}</small>
                  </button>
                ))}
              </nav>

              <div className="modelos-editor-conteudo">
                <header className="modelos-catalogo-cabecalho">
                  <h2>{formularioAtual.nome?.trim() || "Novo formulário"}</h2>
                  <p>
                    Defina as perguntas do modelo. O preenchimento com o paciente é na ficha
                    → Formulários.
                  </p>
                </header>

                <div className="modelos-doc-form-row">
                  <div>
                    <label className="label-form">Nome</label>
                    <input
                      value={formularioAtual.nome || ""}
                      placeholder="Ex.: Anamnese TEA — 9 anos"
                      onChange={(event) =>
                        setFormularioAtual((atual) => ({
                          ...atual,
                          nome: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label-form">Descrição breve</label>
                    <input
                      value={formularioAtual.descricao || ""}
                      placeholder="Para quem serve este formulário"
                      onChange={(event) =>
                        setFormularioAtual((atual) => ({
                          ...atual,
                          descricao: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="anamnese-actions modelos-actions-left">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      setFormularioAtual((atual) => ({
                        ...atual,
                        campos: [...(atual.campos || []), criarCampoInicial()],
                      }))
                    }
                  >
                    + Pergunta
                  </button>
                  <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                    Importar TXT
                    <input
                      type="file"
                      accept=".txt,.csv,text/plain,text/csv"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void importarFormulario(file);
                      }}
                    />
                  </label>
                </div>

                <FormularioCamposLista
                  modo="modelo"
                  campos={formularioAtual.campos || []}
                  onAtualizar={atualizarCampo}
                  onExcluir={(id) =>
                    setFormularioAtual((atual) => ({
                      ...atual,
                      campos: (atual.campos || []).filter((item) => item.id !== id),
                    }))
                  }
                />

                <details className="doc-anexos-details">
                  <summary>Arquivos de referência (opcional)</summary>
                  <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                    Anexar arquivo
                    <input
                      type="file"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void enviarArquivo("formulario", file);
                      }}
                    />
                  </label>
                  {arquivosFormulario.length === 0 ? (
                    <p className="catalog-vazio">Nenhum arquivo anexado.</p>
                  ) : (
                    <ModeloCatalogLista
                      tituloSecao=""
                      itens={arquivosFormulario.map((arquivo) => ({
                        id: arquivo.id,
                        titulo: arquivo.nome_arquivo,
                        onEditar: () => void abrirArquivo(arquivo),
                      }))}
                    />
                  )}
                </details>

                <div className="modelos-doc-footer" style={{ paddingLeft: 0, paddingRight: 0 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={voltarInicioFormularios}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    className="btn btn-green"
                    disabled={salvando}
                    onClick={() => void salvarFormulario()}
                  >
                    {salvando ? "Salvando..." : "Salvar modelo"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </Janela>
    </div>
  );
}
