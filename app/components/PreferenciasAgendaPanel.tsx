"use client";

import { usePreferencias } from "./PreferenciasProvider";
import { OPCOES_DURACAO_SESSAO } from "../lib/preferencias";

type Props = {
  compact?: boolean;
};

export default function PreferenciasAgendaPanel({ compact = false }: Props) {
  const { preferencias, salvando, atualizarPreferencias } = usePreferencias();

  function alterar<K extends keyof typeof preferencias>(
    campo: K,
    valor: (typeof preferencias)[K]
  ) {
    void atualizarPreferencias({ [campo]: valor }, { salvarNuvem: true });
  }

  return (
    <div
      className={`context-prefs-panel${compact ? " context-prefs-panel-compact" : ""}`}
    >
      <div className="context-prefs-header">
        <div>
          <strong>Configurações da agenda</strong>
          <p>
            Padrões ao abrir a agenda e ao agendar sessões.
            {salvando ? " Salvando…" : null}
          </p>
        </div>
      </div>

      <div className="context-prefs-fields">
        <label>
          <span className="context-prefs-label">Visualização inicial</span>
          <select
            value={preferencias.agendaVisualizacao}
            onChange={(e) =>
              alterar(
                "agendaVisualizacao",
                e.target.value === "day"
                  ? "day"
                  : e.target.value === "month"
                    ? "month"
                    : "week"
              )
            }
          >
            <option value="week">Semana</option>
            <option value="day">Dia</option>
            <option value="month">Mês</option>
          </select>
          <span className="context-prefs-hint">Usado ao abrir a Agenda.</span>
        </label>

        <label>
          <span className="context-prefs-label">Modo padrão</span>
          <select
            value={preferencias.agendaModo}
            onChange={(e) =>
              alterar("agendaModo", e.target.value === "dia" ? "dia" : "geral")
            }
          >
            <option value="geral">Agenda geral</option>
            <option value="dia">Sessões por dia</option>
          </select>
          <span className="context-prefs-hint">
            Alterna entre calendário e lista por dia.
          </span>
        </label>

        <label>
          <span className="context-prefs-label">Duração da sessão</span>
          <select
            value={String(preferencias.duracaoSessaoMinutos)}
            onChange={(e) =>
              alterar("duracaoSessaoMinutos", Number(e.target.value))
            }
          >
            {OPCOES_DURACAO_SESSAO.map((min) => (
              <option key={min} value={min}>
                {min} min
              </option>
            ))}
          </select>
          <span className="context-prefs-hint">
            Define o bloco de horário no calendário.
          </span>
        </label>

        <label>
          <span className="context-prefs-label">Valor padrão (R$)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 150,00"
            value={preferencias.valorSessaoPadrao}
            onChange={(e) => alterar("valorSessaoPadrao", e.target.value)}
          />
          <span className="context-prefs-hint">
            Preenche agendamentos e pacientes novos.
          </span>
        </label>

        <label className="context-prefs-check">
          <input
            type="checkbox"
            checked={preferencias.ocultarPacientesInativos}
            onChange={(e) =>
              alterar("ocultarPacientesInativos", e.target.checked)
            }
          />
          <span>Ocultar pacientes inativos ao agendar</span>
        </label>
      </div>
    </div>
  );
}
