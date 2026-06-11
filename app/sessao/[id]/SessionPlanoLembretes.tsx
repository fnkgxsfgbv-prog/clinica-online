"use client";

import { rotuloModoLembretes } from "../../lib/ia-aviso";
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

function classeBadgeModo(modo: LembretesSessaoPlano["modo"]) {
  return modo === "ia" ? "is-ia" : "is-basico";
}

export default function SessionPlanoLembretes({
  lembretes,
  compacto = false,
  carregando = false,
  erro = "",
  temPlano = true,
  onVerPlano,
  onGerarComIa,
  onResumoBasico,
  onRegenerar,
}: {
  lembretes: LembretesSessaoPlano | null;
  compacto?: boolean;
  carregando?: boolean;
  erro?: string;
  temPlano?: boolean;
  onVerPlano?: () => void;
  onGerarComIa?: () => void;
  onResumoBasico?: () => void;
  onRegenerar?: () => void;
}) {
  if (!temPlano) return null;

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
        {onGerarComIa || onResumoBasico ? (
          <div className="session-seguimento-actions">
            {onResumoBasico ? (
              <button type="button" className="session-seguimento-btn" onClick={onResumoBasico}>
                Ver resumo automático
              </button>
            ) : null}
            {onGerarComIa ? (
              <button
                type="button"
                className="session-seguimento-btn is-primary"
                onClick={onGerarComIa}
              >
                Tentar com IA
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (!lembretes) {
    return (
      <div className={`session-seguimento-card is-empty${compacto ? " is-compact" : ""}`}>
        <div className="session-seguimento-header">
          <div>
            <strong>Seguimento de hoje</strong>
            <p className="session-seguimento-muted">
              Gere lembretes a partir do plano terapêutico quando quiser.
            </p>
          </div>
          {compacto && onVerPlano ? (
            <button type="button" className="session-seguimento-link" onClick={onVerPlano}>
              Ver plano
            </button>
          ) : null}
        </div>
        {onGerarComIa || onResumoBasico ? (
          <div className="session-seguimento-actions">
            {onResumoBasico ? (
              <button type="button" className="session-seguimento-btn" onClick={onResumoBasico}>
                Resumo automático
              </button>
            ) : null}
            {onGerarComIa ? (
              <button
                type="button"
                className="session-seguimento-btn is-primary"
                onClick={onGerarComIa}
              >
                Gerar com IA
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const preview = lembretes.lembretes.slice(0, compacto ? 2 : lembretes.lembretes.length);
  const rotuloModo = rotuloModoLembretes(lembretes.modo);

  return (
    <div className={`session-seguimento-card${compacto ? " is-compact" : ""}`}>
      <div className="session-seguimento-header">
        <div>
          <strong>Seguimento de hoje</strong>
          <span
            className={`session-seguimento-badge ${classeBadgeModo(lembretes.modo)}`}
            title={rotuloModo}
          >
            {rotuloModo}
          </span>
        </div>
        <div className="session-seguimento-header-actions">
          {onRegenerar ? (
            <button type="button" className="session-seguimento-link" onClick={onRegenerar}>
              Regenerar
            </button>
          ) : null}
          {compacto && onVerPlano ? (
            <button type="button" className="session-seguimento-link" onClick={onVerPlano}>
              Ver plano
            </button>
          ) : null}
        </div>
      </div>

      {lembretes.avisoIa ? (
        <p className="session-seguimento-muted">{lembretes.avisoIa}</p>
      ) : null}

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
