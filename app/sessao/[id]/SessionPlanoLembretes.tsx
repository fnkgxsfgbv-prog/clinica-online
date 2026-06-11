"use client";

import { useState } from "react";

import { AJUDA_SEGUIMENTO_SESSAO } from "../../lib/ia-ajuda";
import { rotuloModoLembretes } from "../../lib/ia-aviso";
import {
  formatarPreparacaoTextoAgenda,
  rotuloTipoLembrete,
  type LembretesSessaoPlano,
  type TipoLembreteSeguimento,
} from "../../lib/plano-terapeutico-lembretes";
import IaAjudaLista from "../../components/IaAjudaLista";

function classeTipo(tipo: TipoLembreteSeguimento) {
  if (tipo === "meta") return "is-meta";
  if (tipo === "tecnica") return "is-tecnica";
  if (tipo === "monitorar") return "is-monitorar";
  return "is-foco";
}

function classeBadgeModo(modo: LembretesSessaoPlano["modo"]) {
  return modo === "ia" ? "is-ia" : "is-basico";
}

function SeguimentoAjuda({ compacto = false }: { compacto?: boolean }) {
  const [aberta, setAberta] = useState(false);

  return (
    <div className="session-seguimento-ajuda">
      <button
        type="button"
        className="session-seguimento-link"
        aria-expanded={aberta}
        onClick={() => setAberta((atual) => !atual)}
      >
        {aberta ? "Ocultar como funciona" : "Como funciona?"}
      </button>
      {aberta ? (
        <IaAjudaLista
          itens={AJUDA_SEGUIMENTO_SESSAO}
          className={compacto ? "is-compact" : undefined}
        />
      ) : null}
    </div>
  );
}

function tituloPainel(contexto: "sessao" | "pre-sessao") {
  return contexto === "pre-sessao" ? "Preparo sugerido" : "Seguimento de hoje";
}

function textoVazio(contexto: "sessao" | "pre-sessao") {
  if (contexto === "pre-sessao") {
    return "Gere sugestões a partir do plano para preparar a sessão. Você decide se usa no editor.";
  }
  return "Gere lembretes a partir do plano terapêutico quando quiser.";
}

export default function SessionPlanoLembretes({
  lembretes,
  compacto = false,
  carregando = false,
  erro = "",
  temPlano = true,
  contexto = "sessao",
  onVerPlano,
  onGerarComIa,
  onResumoBasico,
  onRegenerar,
  onInserirNoPreparo,
}: {
  lembretes: LembretesSessaoPlano | null;
  compacto?: boolean;
  carregando?: boolean;
  erro?: string;
  temPlano?: boolean;
  contexto?: "sessao" | "pre-sessao";
  onVerPlano?: () => void;
  onGerarComIa?: () => void;
  onResumoBasico?: () => void;
  onRegenerar?: () => void;
  onInserirNoPreparo?: () => void;
}) {
  const titulo = tituloPainel(contexto);
  if (!temPlano) return null;

  if (carregando) {
    return (
      <div
        className={`session-seguimento-card${compacto ? " is-compact" : ""}`}
        aria-live="polite"
      >
        <strong>{titulo}</strong>
        <p className="session-seguimento-muted">
          {contexto === "pre-sessao"
            ? "Gerando sugestões de preparo..."
            : "Gerando lembretes do plano..."}
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className={`session-seguimento-card is-error${compacto ? " is-compact" : ""}`}>
        <strong>{titulo}</strong>
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
            <strong>{titulo}</strong>
            <p className="session-seguimento-muted">{textoVazio(contexto)}</p>
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
        <SeguimentoAjuda compacto={compacto} />
      </div>
    );
  }

  const preview = lembretes.lembretes.slice(0, compacto ? 2 : lembretes.lembretes.length);
  const rotuloModo = rotuloModoLembretes(lembretes.modo);
  const textoPreSessaoAgenda =
    contexto === "pre-sessao" ? formatarPreparacaoTextoAgenda(lembretes) : "";

  return (
    <div className={`session-seguimento-card${compacto ? " is-compact" : ""}`}>
      <div className="session-seguimento-header">
        <div>
          <strong>{titulo}</strong>
          <span
            className={`session-seguimento-badge ${classeBadgeModo(lembretes.modo)}`}
            title={rotuloModo}
          >
            {rotuloModo}
          </span>
        </div>
        <div className="session-seguimento-header-actions">
          {contexto === "pre-sessao" && onInserirNoPreparo ? (
            <button
              type="button"
              className="session-seguimento-link"
              onClick={onInserirNoPreparo}
            >
              Salvar na agenda
            </button>
          ) : null}
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

      {contexto === "pre-sessao" ? (
        <>
          <p className="session-seguimento-foco">{textoPreSessaoAgenda}</p>
          <p className="session-seguimento-muted">
            Este texto aparece na coluna Pré-sessão da agenda após salvar.
          </p>
        </>
      ) : (
        <>
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
        </>
      )}

      {contexto !== "pre-sessao" && compacto && lembretes.lembretes.length > preview.length && onVerPlano ? (
        <button type="button" className="session-seguimento-link" onClick={onVerPlano}>
          +{lembretes.lembretes.length - preview.length} lembretes
        </button>
      ) : null}

      <SeguimentoAjuda compacto={compacto} />
    </div>
  );
}
