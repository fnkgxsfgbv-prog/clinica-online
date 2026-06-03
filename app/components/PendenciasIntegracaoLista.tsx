"use client";

import Link from "next/link";

import type { LinhaPendencia } from "../lib/checklist-clinica";

type Props = {
  linhas: LinhaPendencia[];
};

export default function PendenciasIntegracaoLista({ linhas }: Props) {
  if (linhas.length === 0) {
    return (
      <section className="clinic-card clinic-tool-card">
        <div className="clinic-insight-item is-ok">
          <strong>0</strong>
          <div>
            <span>Nenhum item pendente</span>
            <p>Tudo certo nesta categoria.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="clinic-card clinic-tool-card clinic-tool-card-wide">
      <div className="clinic-tool-header">
        <div>
          <h2>
            {linhas.length} {linhas.length === 1 ? "ocorrência" : "ocorrências"}
          </h2>
          <p>
            Cada linha é uma presença na frequência. Siga o link para corrigir
            na agenda ou no cadastro.
          </p>
        </div>
      </div>

      <div className="pendencias-lista">
        {linhas.map((linha) => (
          <Link
            key={linha.id}
            href={linha.href}
            className="pendencias-lista-item"
          >
            <div>
              <strong>{linha.titulo}</strong>
              <p>{linha.detalhe}</p>
            </div>
            <span className="pendencias-lista-acao">
              {linha.rotuloAcao || "Abrir"} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
