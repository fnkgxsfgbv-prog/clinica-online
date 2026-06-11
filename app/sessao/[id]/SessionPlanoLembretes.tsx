"use client";

import {
  rotuloTipoLembrete,
  type LembretesSessaoPlano,
  type TipoLembreteSeguimento,
} from "../../lib/plano-terapeutico-lembretes";

function classeTipo(tipo: TipoLembreteSeguimento) {
  if (tipo === "meta") return "is-meta";
  if (tipo === "tecnica") return "is-tecnica";
  if (tipo === "monitorar") return "is-monitorar";
  return "is-foco";
}

export default function SessionPlanoLembretes({
  lembretes,
  compacto = false,
  carregando = false,
  erro = "",
  onVerPlano,
}: {
  lembretes: LembretesSessaoPlano | null;
  compacto?: boolean;
  carregando?: boolean;
  erro?: string;
  onVerPlano?: () => void;
}) {
  if (carregando) {
    return (
      <div
        className={`session-seguimento-card${compacto ? " is-compact" : ""}`}
        aria-live="polite"
      >
        <strong>Seguimento de hoje</strong>
        <p className="session-seguimento-muted">Gerando lembretes do plano...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className={`session-seguimento-card is-error${compacto ? " is-compact" : ""}`}>
        <strong>Seguimento de hoje</strong>
        <p className="session-seguimento-muted">{erro}</p>
      </div>
    );
  }

  if (!lembretes) return null;

  const preview = lembretes.lembretes.slice(0, compacto ? 2 : lembretes.lembretes.length);

  return (
    <div className={`session-seguimento-card${compacto ? " is-compact" : ""}`}>
      <div className="session-seguimento-header">
        <div>
          <strong>Seguimento de hoje</strong>
          {lembretes.usouIa ? (
            <span className="session-seguimento-badge">IA</span>
          ) : null}
        </div>
        {compacto && onVerPlano ? (
          <button type="button" className="session-seguimento-link" onClick={onVerPlano}>
            Ver plano
          </button>
        ) : null}
      </div>

      <p className="session-seguimento-foco">{lembretes.focoHoje}</p>

      {preview.length ? (
        <ul className="session-seguimento-lista">
          {preview.map((item) => (
            <li key={`${item.tipo}-${item.texto}`} className={classeTipo(item.tipo)}>
              <span>{rotuloTipoLembrete(item.tipo)}</span>
              <p>{item.texto}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {compacto && lembretes.lembretes.length > preview.length && onVerPlano ? (
        <button type="button" className="session-seguimento-link" onClick={onVerPlano}>
          +{lembretes.lembretes.length - preview.length} lembretes
        </button>
      ) : null}
    </div>
  );
}
