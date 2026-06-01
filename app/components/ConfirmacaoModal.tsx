"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  aberto: boolean;
  titulo: string;
  children: ReactNode;
  rotuloCancelar?: string;
  rotuloConfirmar?: string;
  confirmando?: boolean;
  perigo?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export default function ConfirmacaoModal({
  aberto,
  titulo,
  children,
  rotuloCancelar = "Cancelar",
  rotuloConfirmar = "Confirmar",
  confirmando = false,
  perigo = false,
  onCancelar,
  onConfirmar,
}: Props) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelarRef.current?.focus();

    function aoTeclar(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirmando) {
        onCancelar();
      }
    }

    window.addEventListener("keydown", aoTeclar);

    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, confirmando, onCancelar]);

  if (!aberto) return null;

  const modal = (
    <div
      className={`confirmacao-overlay${perigo ? " confirmacao-overlay--perigo" : ""}`}
      role="presentation"
      onClick={() => {
        if (!confirmando) onCancelar();
      }}
    >
      <div
        className={`confirmacao-card${perigo ? " confirmacao-card--perigo" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacao-modal-titulo"
        aria-describedby="confirmacao-modal-corpo"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirmacao-cabecalho">
          {perigo ? (
            <span className="confirmacao-icone" aria-hidden="true">
              !
            </span>
          ) : null}
          <h2 id="confirmacao-modal-titulo" className="confirmacao-titulo">
            {titulo}
          </h2>
        </div>

        <div id="confirmacao-modal-corpo" className="confirmacao-corpo">
          {children}
        </div>

        <div className="confirmacao-acoes">
          <button
            ref={cancelarRef}
            type="button"
            className="btn btn-outline confirmacao-btn"
            disabled={confirmando}
            onClick={onCancelar}
          >
            {rotuloCancelar}
          </button>
          <button
            type="button"
            className={`btn confirmacao-btn ${perigo ? "btn-danger" : "btn-green"}`}
            disabled={confirmando}
            onClick={onConfirmar}
          >
            {confirmando ? "Aguarde..." : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
