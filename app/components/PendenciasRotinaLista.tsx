"use client";

import Link from "next/link";

import type { LinhaPendencia } from "../lib/checklist-clinica";

type Props = {
  linhas: LinhaPendencia[];
  descricaoAcao?: string;
};

export default function PendenciasRotinaLista({
  linhas,
  descricaoAcao = "Abra a ficha ou a agenda para retomar o atendimento.",
}: Props) {
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
            {linhas.length} {linhas.length === 1 ? "paciente" : "pacientes"}
          </h2>
          <p>{descricaoAcao}</p>
        </div>
        <Link className="btn btn-outline" href="/agenda">
          Ir para agenda
        </Link>
      </div>

      <div className="pendencias-table-wrap">
        <table className="pendencias-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.id}>
                <td className="pendencias-table-nome">
                  <strong>{linha.titulo}</strong>
                </td>
                <td>{linha.detalhe}</td>
                <td className="pendencias-table-acoes">
                  <Link
                    className="btn btn-outline btn-sm"
                    href={linha.href}
                  >
                    {linha.rotuloAcao || "Abrir"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
