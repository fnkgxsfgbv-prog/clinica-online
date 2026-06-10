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
  onRestaurarPadrao: () => void;
};

export function DashboardBlocoAcoes({
  id,
  editando,
  podeSubir,
  podeDescer,
  onOcultar,
  onMoverCima,
  onMoverBaixo,
}: {
  id: DashboardBlocoId;
  editando: boolean;
  podeSubir: boolean;
  podeDescer: boolean;
  onOcultar: (id: DashboardBlocoId) => void;
  onMoverCima: (id: DashboardBlocoId) => void;
  onMoverBaixo: (id: DashboardBlocoId) => void;
}) {
  if (!editando) return null;

  return (
    <div className="dashboard-bloco-acoes">
      <span className="dashboard-bloco-acoes-label">
        {DASHBOARD_BLOCO_LABELS[id]}
      </span>
      <div className="dashboard-bloco-acoes-botoes">
        <button
          type="button"
          className="btn btn-outline btn-sm dashboard-bloco-mover"
          disabled={!podeSubir}
          onClick={() => onMoverCima(id)}
          aria-label={`Mover ${DASHBOARD_BLOCO_LABELS[id]} para cima`}
          title="Mover para cima"
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm dashboard-bloco-mover"
          disabled={!podeDescer}
          onClick={() => onMoverBaixo(id)}
          aria-label={`Mover ${DASHBOARD_BLOCO_LABELS[id]} para baixo`}
          title="Mover para baixo"
        >
          ↓
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm dashboard-bloco-ocultar"
          onClick={() => onOcultar(id)}
          aria-label={`Ocultar ${DASHBOARD_BLOCO_LABELS[id]}`}
        >
          Ocultar
        </button>
      </div>
    </div>
  );
}

export default function DashboardPersonalizar({
  editando,
  blocosOcultos,
  onToggleEditando,
  onMostrar,
  onRestaurarPadrao,
}: Props) {
  const blocosParaRestaurar = DASHBOARD_BLOCO_IDS.filter((id) =>
    blocosOcultos.includes(id)
  );

  return (
    <div className="dashboard-personalizar-bar">
      <button
        type="button"
        className={`btn btn-outline dashboard-editar-btn${
          editando ? " is-active" : ""
        }`}
        onClick={onToggleEditando}
      >
        {editando ? "Concluir edição" : "Editar dashboard"}
      </button>

      {editando ? (
        <button
          type="button"
          className="btn btn-outline"
          onClick={onRestaurarPadrao}
        >
          Restaurar layout padrão
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
