"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="login-page">
      <div className="login-card status-page-card">
        <h1>Algo deu errado</h1>
        <p className="login-subtitle">
          Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao
          início.
        </p>
        <div className="status-page-actions">
          <button className="btn btn-green" type="button" onClick={() => reset()}>
            Tentar de novo
          </button>
          <Link className="btn btn-outline" href="/">
            Ir ao painel
          </Link>
        </div>
        <Link className="login-text-link" href="/login">
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
