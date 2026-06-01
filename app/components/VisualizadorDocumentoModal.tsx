"use client";

import { useEffect, useMemo } from "react";
import type { VisualizacaoDocumento } from "../lib/documento-visualizacao";

type Props = {
  visualizacao: VisualizacaoDocumento | null;
  carregando?: boolean;
  onFechar: () => void;
};

export default function VisualizadorDocumentoModal({
  visualizacao,
  carregando = false,
  onFechar,
}: Props) {
  const urlPdf = useMemo(() => {
    if (visualizacao?.tipo !== "pdf") return "";
    const base = visualizacao.url.split("#")[0];
    return `${base}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
  }, [visualizacao]);

  useEffect(() => {
    if (!visualizacao) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = anterior;
      if (
        visualizacao.tipo !== "formulario" &&
        visualizacao.revogarUrl
      ) {
        visualizacao.revogarUrl();
      }
    };
  }, [visualizacao]);

  useEffect(() => {
    function aoTeclar(event: KeyboardEvent) {
      if (event.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  if (!visualizacao && !carregando) return null;

  const titulo = visualizacao?.titulo || "Documento";
  const urlDownload =
    visualizacao && visualizacao.tipo !== "formulario"
      ? visualizacao.urlDownload
      : undefined;

  return (
    <div
      className="doc-viewer-overlay psicomanager-file-viewer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-titulo"
    >
      <div className="doc-viewer-shell">
        <header className="doc-viewer-toolbar">
          <p id="doc-viewer-titulo" className="doc-viewer-filename" title={titulo}>
            {titulo}
          </p>

          <div className="doc-viewer-toolbar-actions">
            {urlDownload ? (
              <a
                className="btn btn-outline doc-viewer-action"
                href={urlDownload}
                download={titulo}
                target="_blank"
                rel="noopener noreferrer"
              >
                Baixar
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-outline doc-viewer-action"
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="doc-viewer-stage">
          {carregando ? (
            <p className="doc-viewer-loading">Abrindo documento...</p>
          ) : visualizacao?.tipo === "pdf" ? (
            <embed
              className="doc-viewer-embed"
              src={urlPdf}
              type="application/pdf"
              title={titulo}
            />
          ) : visualizacao?.tipo === "imagem" ? (
            <div className="doc-viewer-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="doc-viewer-image"
                src={visualizacao.url}
                alt={titulo}
              />
            </div>
          ) : visualizacao?.tipo === "formulario" ? (
            <article className="doc-viewer-paper">
              <h1 className="doc-viewer-paper-title">{visualizacao.titulo}</h1>

              {visualizacao.meta.length > 0 ? (
                <div className="doc-viewer-meta">
                  {visualizacao.meta.map((linha) => (
                    <p key={linha}>{linha}</p>
                  ))}
                </div>
              ) : null}

              {visualizacao.campos.length === 0 ? (
                <p className="doc-viewer-empty">Nenhum conteúdo neste documento.</p>
              ) : (
                visualizacao.campos.map((campo) => (
                  <section key={campo.titulo} className="doc-viewer-campo">
                    <h2>{campo.titulo}</h2>
                    <p>{campo.resposta}</p>
                  </section>
                ))
              )}
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
}
