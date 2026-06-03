"use client";

import { usePreferencias } from "./PreferenciasProvider";

export default function PreferenciasMesPanel() {
  const { preferencias, salvando, atualizarPreferencias } = usePreferencias();

  function alterarMesModo(valor: "automatico" | "ultimo") {
    void atualizarPreferencias({ mesModo: valor }, { salvarNuvem: true });
  }

  function alterarAviso(checked: boolean) {
    void atualizarPreferencias({ avisoViradaMes: checked }, { salvarNuvem: true });
  }

  return (
    <div className="context-prefs-panel context-prefs-panel-inline">
      <div className="context-prefs-header">
        <div>
          <strong>Comportamento do mês</strong>
          <p>
            Vale para Financeiro e Frequência.
            {salvando ? " Salvando…" : null}
          </p>
        </div>
      </div>

      <div className="context-prefs-fields context-prefs-fields-row">
        <label>
          <span className="context-prefs-label">Ao abrir o relatório</span>
          <select
            value={preferencias.mesModo}
            onChange={(e) =>
              alterarMesModo(
                e.target.value === "ultimo" ? "ultimo" : "automatico"
              )
            }
          >
            <option value="automatico">Seguir o mês do calendário</option>
            <option value="ultimo">Manter o último mês escolhido</option>
          </select>
        </label>

        <label className="context-prefs-check">
          <input
            type="checkbox"
            checked={preferencias.avisoViradaMes}
            onChange={(e) => alterarAviso(e.target.checked)}
          />
          <span>Avisar quando virar de mês</span>
        </label>
      </div>
    </div>
  );
}
