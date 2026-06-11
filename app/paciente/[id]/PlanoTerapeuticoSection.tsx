"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import FlashMessage from "../../components/FlashMessage";
import RichTextEditor, {
  normalizarConteudoEditor,
  sanitizarHtmlBasico,
} from "../../components/RichTextEditor";
import { getCurrentUser } from "../../lib/auth";
import {
  getPlanoTerapeuticoPorPaciente,
  salvarPlanoTerapeuticoPaciente,
} from "../../lib/db/plano-terapeutico";
import { planoTerapeuticoTemConteudo } from "../../lib/resumo-texto-clinico";
import { requireUserClient } from "../../lib/require-user-client";
import type { PacientePlanoTerapeutico } from "../../types";

type ImportacaoPdfResposta = {
  conteudo: string;
  resumo: string;
  totalPaginas: number;
  usouIa: boolean;
  avisoIa?: string;
  pdfNomeArquivo: string;
  pdfStoragePath: string;
  salvo: boolean;
};

type ImportacaoPdfPendente = {
  conteudo: string;
  resumo: string;
  totalPaginas: number;
  usouIa: boolean;
  avisoIa?: string;
  pdfNomeArquivo: string;
  pdfStoragePath: string;
};

export default function PlanoTerapeuticoSection({
  pacienteId,
  onDocumentosChanged,
}: {
  pacienteId: string | number;
  onDocumentosChanged?: () => Promise<void>;
}) {
  const router = useRouter();
  const inputPdfRef = useRef<HTMLInputElement>(null);
  const [conteudo, setConteudo] = useState("");
  const [pdfNomeArquivo, setPdfNomeArquivo] = useState<string | null>(null);
  const [pdfStoragePath, setPdfStoragePath] = useState<string | null>(null);
  const [pdfImportadoEm, setPdfImportadoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [importandoPdf, setImportandoPdf] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [inicializado, setInicializado] = useState(false);
  const [importacaoPendente, setImportacaoPendente] =
    useState<ImportacaoPdfPendente | null>(null);
  const ultimoSnapshotRef = useRef("");
  const conteudoRef = useRef("");
  const pdfStoragePathRef = useRef<string | null>(null);
  const pdfNomeArquivoRef = useRef<string | null>(null);
  const pdfImportadoEmRef = useRef<string | null>(null);
  const salvandoRef = useRef(false);
  const salvarNovamenteDepoisRef = useRef(false);

  useEffect(() => {
    conteudoRef.current = conteudo;
  }, [conteudo]);

  useEffect(() => {
    pdfStoragePathRef.current = pdfStoragePath;
  }, [pdfStoragePath]);

  useEffect(() => {
    pdfNomeArquivoRef.current = pdfNomeArquivo;
  }, [pdfNomeArquivo]);

  useEffect(() => {
    pdfImportadoEmRef.current = pdfImportadoEm;
  }, [pdfImportadoEm]);

  const carregarPlano = useCallback(async () => {
    setCarregando(true);
    setErro("");
    setSucesso("");

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data, error } = await getPlanoTerapeuticoPorPaciente(user.id, pacienteId);

    if (error) {
      setErro("Erro ao carregar plano terapêutico: " + error.message);
      setCarregando(false);
      return;
    }

    const registro = (data || null) as PacientePlanoTerapeutico | null;
    const texto = registro?.conteudo || "";
    setConteudo(texto);
    setPdfNomeArquivo(registro?.pdf_nome_arquivo || null);
    setPdfStoragePath(registro?.pdf_storage_path || null);
    setPdfImportadoEm(registro?.pdf_importado_em || null);
    ultimoSnapshotRef.current = texto;
    setUltimaAtualizacao(registro?.updated_at || null);
    setInicializado(true);
    setCarregando(false);
  }, [pacienteId, router]);

  useEffect(() => {
    void carregarPlano();
  }, [carregarPlano]);

  async function salvar(mostrarMensagem = true) {
    if (salvandoRef.current) {
      salvarNovamenteDepoisRef.current = true;
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);
    if (mostrarMensagem) {
      setErro("");
      setSucesso("");
    }

    const user = await requireUserClient(router, getCurrentUser);
    if (!user) {
      salvandoRef.current = false;
      setSalvando(false);
      return;
    }

    const textoAtual = sanitizarHtmlBasico(conteudoRef.current);
    const { data, error } = await salvarPlanoTerapeuticoPaciente({
      userId: user.id,
      pacienteId,
      conteudo: textoAtual,
      pdfStoragePath: pdfStoragePathRef.current,
      pdfNomeArquivo: pdfNomeArquivoRef.current,
      pdfImportadoEm: pdfImportadoEmRef.current,
    });

    if (error) {
      if (mostrarMensagem) {
        setErro("Erro ao salvar plano terapêutico: " + error.message);
      }
    } else {
      ultimoSnapshotRef.current = textoAtual;
      setConteudo(textoAtual);
      const registro = (data || null) as PacientePlanoTerapeutico | null;
      setUltimaAtualizacao(registro?.updated_at || new Date().toISOString());
      if (mostrarMensagem) {
        setSucesso("Plano terapêutico salvo.");
      }
    }

    salvandoRef.current = false;
    setSalvando(false);

    if (salvarNovamenteDepoisRef.current) {
      salvarNovamenteDepoisRef.current = false;
      void salvar(false);
    }
  }

  useEffect(() => {
    if (!inicializado || carregando) return;
    if (conteudo === ultimoSnapshotRef.current) return;

    const timer = window.setTimeout(() => {
      void salvar(false);
    }, 900);

    return () => window.clearTimeout(timer);
    // salvar usa refs para o conteúdo atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, conteudo, inicializado]);

  async function importarPdf(file: File) {
    setImportandoPdf(true);
    setErro("");
    setSucesso("");
    setImportacaoPendente(null);

    const formData = new FormData();
    formData.append("arquivo", file);
    formData.append("pacienteId", String(pacienteId));
    formData.append("salvarAutomatico", "false");

    try {
      const resposta = await fetch("/api/plano-terapeutico/importar-pdf", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const corpo = (await resposta.json()) as ImportacaoPdfResposta & {
        erro?: string;
      };

      if (!resposta.ok) {
        setErro(corpo.erro || "Não foi possível importar o PDF.");
        return;
      }

      setImportacaoPendente({
        conteudo: normalizarConteudoEditor(corpo.conteudo),
        resumo: corpo.resumo,
        totalPaginas: corpo.totalPaginas,
        usouIa: corpo.usouIa,
        avisoIa: corpo.avisoIa,
        pdfNomeArquivo: corpo.pdfNomeArquivo,
        pdfStoragePath: corpo.pdfStoragePath,
      });
      await onDocumentosChanged?.();
    } catch {
      setErro("Falha de rede ao importar o PDF. Tente novamente.");
    } finally {
      setImportandoPdf(false);
      if (inputPdfRef.current) {
        inputPdfRef.current.value = "";
      }
    }
  }

  function aplicarImportacaoPdf() {
    if (!importacaoPendente) return;

    const agora = new Date().toISOString();
    setConteudo(importacaoPendente.conteudo);
    setPdfNomeArquivo(importacaoPendente.pdfNomeArquivo);
    setPdfStoragePath(importacaoPendente.pdfStoragePath);
    setPdfImportadoEm(agora);
    setImportacaoPendente(null);
    setSucesso(
      importacaoPendente.usouIa
        ? "Plano importado e organizado com IA. Revise o texto e salve."
        : importacaoPendente.avisoIa
          ? `${importacaoPendente.avisoIa} Revise o texto e salve.`
          : "Plano importado do PDF. Revise o texto e salve."
    );
  }

  const rotuloAtualizacao = ultimaAtualizacao
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(ultimaAtualizacao))
    : null;

  const rotuloPdfImportado = pdfImportadoEm
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(pdfImportadoEm))
    : null;

  if (carregando) {
    return <p className="patient-muted">Carregando plano terapêutico...</p>;
  }

  return (
    <div className="plano-terapeutico-section">
      <div className="plano-terapeutico-header">
        <div>
          <strong>Plano terapêutico do paciente</strong>
          <p className="patient-muted">
            Escreva manualmente ou importe um PDF — o sistema extrai o texto e
            organiza o plano automaticamente (com IA na nuvem, se configurada).
          </p>
          {rotuloAtualizacao ? (
            <p className="patient-muted plano-terapeutico-updated">
              Última atualização: {rotuloAtualizacao}
              {salvando ? " · salvando..." : ""}
            </p>
          ) : null}
          {pdfNomeArquivo && rotuloPdfImportado ? (
            <p className="patient-muted plano-terapeutico-updated">
              PDF importado: {pdfNomeArquivo} · {rotuloPdfImportado}
            </p>
          ) : null}
        </div>
        <div className="plano-terapeutico-actions">
          <input
            ref={inputPdfRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(evento) => {
              const file = evento.target.files?.[0];
              if (file) void importarPdf(file);
            }}
          />
          <button
            type="button"
            className="btn btn-outline"
            disabled={importandoPdf || salvando}
            onClick={() => inputPdfRef.current?.click()}
          >
            {importandoPdf ? "Lendo PDF..." : "Importar PDF"}
          </button>
          <button
            type="button"
            className="btn btn-green"
            disabled={salvando || importandoPdf}
            onClick={() => void salvar(true)}
          >
            {salvando ? "Salvando..." : "Salvar plano"}
          </button>
        </div>
      </div>

      {erro ? <FlashMessage kind="error">{erro}</FlashMessage> : null}
      {sucesso ? <FlashMessage kind="success">{sucesso}</FlashMessage> : null}

      {!planoTerapeuticoTemConteudo(conteudo) && !importacaoPendente ? (
        <FlashMessage kind="info">
          Plano ainda não cadastrado. Importe um PDF ou escreva abaixo para
          habilitar o painel de seguimento nas sessões.
        </FlashMessage>
      ) : null}

      {importacaoPendente ? (
        <div className="plano-terapeutico-import-preview">
          <div>
            <strong>Prévia da importação</strong>
            <p className="patient-muted">
              {importacaoPendente.pdfNomeArquivo} · {importacaoPendente.totalPaginas}{" "}
              {importacaoPendente.totalPaginas === 1 ? "página" : "páginas"}
              {importacaoPendente.usouIa
                ? " · organizado com IA"
                : " · organizado automaticamente"}
            </p>
            <p>{importacaoPendente.resumo}</p>
            {importacaoPendente.avisoIa ? (
              <p className="patient-muted">{importacaoPendente.avisoIa}</p>
            ) : null}
          </div>
          <div className="plano-terapeutico-import-actions">
            <button
              type="button"
              className="btn btn-green"
              onClick={aplicarImportacaoPdf}
            >
              Usar no plano
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setImportacaoPendente(null)}
            >
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      <RichTextEditor
        editorLabel="Plano terapêutico"
        placeholder="Ex.: Fase 1 — regulação emocional (4 semanas). Técnicas: respiração diafragmática, registro de pensamentos. Monitorar sono 2x/semana. Meta: reduzir crises de ansiedade em situações sociais..."
        value={conteudo}
        onChange={setConteudo}
      />
    </div>
  );
}
