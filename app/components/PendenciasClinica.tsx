"use client";

import Link from "next/link";

import type { ItemChecklistClinica } from "../lib/checklist-clinica";
import {
  filtrarPendenciasChecklist,
  totalPendenciasChecklist,
} from "../lib/checklist-clinica";

type Props = {
  itens: ItemChecklistClinica[];
  titulo?: string;
  mostrarOk?: boolean;
  limite?: number;
  linkPreferencias?: boolean;
};

export default function PendenciasClinica({
  itens,
  titulo = "Pendências da clínica",
  mostrarOk = false,
  limite = 8,
  linkPreferencias = true,
}: Props) {
  const pendencias = filtrarPendenciasChecklist(itens);
  const total = totalPendenciasChecklist(itens);
  const visiveis = mostrarOk ? itens.slice(0, limite) : pendencias.slice(0, limite);

  if (visiveis.length === 0) {
    return (
      <section className="clinic-card clinic-tool-card clinic-tool-card-wide">
        <div className="clinic-tool-header">
          <div>
            <h2>{titulo}</h2>
            <p>Tudo certo por aqui — nenhuma pendência encontrada.</p>
          </div>
        </div>
        <div className="clinic-insight-item is-ok">
          <strong>0</strong>
          <div>
            <span>Sem pendências</span>
            <p>Cadastro, integração e rotina estão alinhados.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="clinic-card clinic-tool-card clinic-tool-card-wide">
      <div className="clinic-tool-header">
        <div>
          <h2>{titulo}</h2>
          <p>
            {total} {total === 1 ? "item" : "itens"} para revisar — cadastro,
            vínculos agenda/frequência e rotina.
          </p>
        </div>
        {linkPreferencias ? (
          <Link className="btn btn-outline" href="/preferencias">
            Preferências
          </Link>
        ) : null}
      </div>

      <div className="clinic-insight-list clinic-insight-list-wide">
        {visiveis.map((item) => {
          const conteudo = (
            <>
              <strong>{item.valor}</strong>
              <div>
                <span>{item.titulo}</span>
                <p>{item.descricao}</p>
              </div>
            </>
          );

          return item.href ? (
            <Link
              key={item.id}
              href={item.href}
              className={`clinic-insight-item clinic-insight-link${
                item.tom === "warn" && item.valor > 0 ? " is-warn" : " is-ok"
              }`}
            >
              {conteudo}
            </Link>
          ) : (
            <div
              key={item.id}
              className={`clinic-insight-item${
                item.tom === "warn" && item.valor > 0 ? " is-warn" : " is-ok"
              }`}
            >
              {conteudo}
            </div>
          );
        })}
      </div>
    </section>
  );
}
