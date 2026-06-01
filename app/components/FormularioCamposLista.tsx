import type { AnamneseCampo } from "../types";

type CampoChave = "titulo" | "placeholder" | "resposta";

export default function FormularioCamposLista({
  modo,
  campos,
  onAtualizar,
  onExcluir,
}: {
  modo: "modelo" | "paciente";
  campos: AnamneseCampo[];
  onAtualizar: (id: string, chave: CampoChave, valor: string) => void;
  onExcluir?: (id: string) => void;
}) {
  if (modo === "modelo") {
    return (
      <div className="formulario-campos-lista formulario-campos-lista--modelo">
        {campos.map((campo, indice) => (
          <div key={campo.id} className="formulario-campo-card">
            <div className="formulario-campo-card-top">
              <span className="formulario-campo-indice">Pergunta {indice + 1}</span>
              {onExcluir ? (
                <button
                  type="button"
                  className="formulario-campo-remover"
                  title="Excluir pergunta"
                  aria-label={`Excluir pergunta ${campo.titulo || indice + 1}`}
                  onClick={() => onExcluir(campo.id)}
                >
                  ×
                </button>
              ) : null}
            </div>

            <label className="formulario-campo-grupo">
              <span className="formulario-campo-label">Pergunta</span>
              <input
                className="formulario-campo-pergunta"
                value={campo.titulo}
                placeholder="Ex.: Queixa principal, Histórico familiar..."
                onChange={(event) =>
                  onAtualizar(campo.id, "titulo", event.target.value)
                }
              />
            </label>

            <label className="formulario-campo-grupo">
              <span className="formulario-campo-label formulario-campo-label--sec">
                Orientação para quem preenche (opcional)
              </span>
              <input
                className="formulario-campo-orientacao"
                value={campo.placeholder || ""}
                placeholder="Ex.: O que a família mais preocupa hoje?"
                onChange={(event) =>
                  onAtualizar(campo.id, "placeholder", event.target.value)
                }
              />
            </label>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="formulario-campos-lista formulario-campos-lista--paciente">
      {campos.map((campo, indice) => (
        <label key={campo.id} className="formulario-campo-preenchimento">
          <span className="formulario-campo-preenchimento-top">
            <span className="formulario-campo-preenchimento-titulo">
              {indice + 1}. {campo.titulo || "Campo sem título"}
            </span>
            {onExcluir ? (
              <button
                type="button"
                className="formulario-campo-remover formulario-campo-remover--inline"
                title="Excluir campo"
                aria-label={`Excluir ${campo.titulo || "campo"}`}
                onClick={(event) => {
                  event.preventDefault();
                  onExcluir(campo.id);
                }}
              >
                ×
              </button>
            ) : null}
          </span>
          {campo.placeholder ? (
            <span className="formulario-campo-preenchimento-hint">
              {campo.placeholder}
            </span>
          ) : null}
          <textarea
            className="formulario-campo-resposta"
            rows={4}
            value={campo.resposta || ""}
            placeholder="Escreva a resposta da entrevista..."
            onChange={(event) =>
              onAtualizar(campo.id, "resposta", event.target.value)
            }
          />
        </label>
      ))}
    </div>
  );
}
