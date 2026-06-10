"use client";

import {
  DASHBOARD_BLOCO_IDS,
  DASHBOARD_BLOCO_LABELS,
  type DashboardBlocoId,
} from "../lib/dashboard-blocos";

type Props = {
  editando: boolean;
  blocosOcultos: DashboardBlocoId[];
  onToggleEditando: () => void;
  onMostrar: (id: DashboardBlocoId) => void;
  onRestaurarTodos: () => void;
};

export function DashboardBlocoAcoes({
  id,
  editando,
  onOcultar,
}: {
  id: DashboardBlocoId;
  editando: boolean;
  onOcultar: (id: DashboardBlocoId) => void;
}) {
  if (!editando) return null;

  return (
    <div className="dashboard-bloco-acoes">
      <button
        type="button"
        className="btn btn-outline btn-sm dashboard-bloco-ocultar"
        onClick={() => onOcultar(id)}
        aria-label={`Ocultar ${DASHBOARD_BLOCO_LABELS[id]}`}
      >
        Ocultar bloco
      </button>
    </div>
  );
}

export default function DashboardPersonalizar({
  editando,
  blocosOcultos,
  onToggleEditando,
  onMostrar,
  onRestaurarTodos,
}: Props) {
  const blocosParaRestaurar = DASHBOARD_BLOCO_IDS.filter((id) =>
    blocosOcultos.includes(id)
  );

  return (
    <div className="dashboard-personalizar-bar">
      <button
        type="button"
        className={`btn btn-outline${editando ? " is-active" : ""}`}
        onClick={onToggleEditando}
      >
        {editando ? "Concluir personalização" : "Personalizar dashboard"}
      </button>

      {editando && blocosOcultos.length > 0 ? (
        <button
          type="button"
          className="btn btn-outline"
          onClick={onRestaurarTodos}
        >
          Mostrar todos os blocos
        </button>
      ) : null}

      {editando && blocosParaRestaurar.length > 0 ? (
        <div className="dashboard-blocos-ocultos">
          <span className="dashboard-blocos-ocultos-label">Ocultos:</span>
          {blocosParaRestaurar.map((id) => (
            <button
              key={id}
              type="button"
              className="btn btn-outline btn-sm dashboard-bloco-restaurar"
              onClick={() => onMostrar(id)}
            >
              + {DASHBOARD_BLOCO_LABELS[id]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
