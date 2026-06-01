"use client";

import { useState } from "react";
import {
  pareceHtml,
  sanitizarHtmlBasico,
} from "./RichTextEditor";
import { formatarDataPaciente } from "../lib/datas-paciente";
import type { Evolucao } from "../types";

type EvolucaoHistoricoCardProps = {
  evolucao: Evolucao;
  statusFallback?: string;
  rotuloPlano?: string;
};

export default function EvolucaoHistoricoCard({
  evolucao,
  statusFallback = "Realizada",
  rotuloPlano = "Plano",
}: EvolucaoHistoricoCardProps) {
  const [aberta, setAberta] = useState(false);
  const evolucaoId = String(evolucao.id);

  return (
    <div
      className={`psico-card patient-evolution-card${
        aberta ? " is-open" : " is-collapsed"
      }`}
    >
      <button
        type="button"
        className="patient-evolution-toggle"
        onClick={() => setAberta((atual) => !atual)}
        aria-expanded={aberta}
        aria-controls={`evolucao-corpo-${evolucaoId}`}
      >
        <span className="patient-evolution-chevron" aria-hidden="true">
          {aberta ? "▾" : "▸"}
        </span>
        <span className="patient-evolution-toggle-text">
          <span className="patient-evolution-date">
            {evolucao.data
              ? formatarDataPaciente(evolucao.data)
              : "Sem data"}
          </span>
          <span className="patient-evolution-status">
            {evolucao.status_sessao || statusFallback}
          </span>
        </span>
        <span className="patient-evolution-toggle-hint">
          {aberta ? "Recolher" : "Expandir"}
        </span>
      </button>

      {aberta ? (
        <div
          id={`evolucao-corpo-${evolucaoId}`}
          className="patient-evolution-body"
        >
          <Campo titulo="Humor" valor={evolucao.humor} />
          <Campo titulo="Queixa" valor={evolucao.queixa} />
          <Campo titulo="Objetivo" valor={evolucao.objetivo} />
          <Campo titulo="Intervenção" valor={evolucao.intervencao} />
          <Campo titulo="Observações" valor={evolucao.observacoes} />
          <Campo titulo={rotuloPlano} valor={evolucao.plano} />
          <Campo titulo="Encaminhamentos" valor={evolucao.encaminhamentos} />
        </div>
      ) : null}
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
      <strong className="patient-field-title">{titulo}</strong>
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
