export default function ModeloCatalogCard({
  badge,
  titulo,
  meta,
  acaoPrincipal,
  rotuloPrincipal = "Editar",
  acaoSecundaria,
  rotuloSecundario = "Salvar na biblioteca",
  variante = "padrao",
  desabilitado,
}: {
  badge?: string;
  titulo: string;
  meta?: string;
  acaoPrincipal: () => void;
  rotuloPrincipal?: string;
  acaoSecundaria?: () => void;
  rotuloSecundario?: string;
  variante?: "padrao" | "criar";
  desabilitado?: boolean;
}) {
  return (
    <article
      className={`catalog-card${
        variante === "criar" ? " catalog-card--criar" : ""
      }`}
    >
      {badge ? <span className="catalog-card-badge">{badge}</span> : null}
      <h3 className="catalog-card-titulo">{titulo}</h3>
      {meta ? <p className="catalog-card-meta">{meta}</p> : null}
      <div className="catalog-card-acoes">
        <button
          type="button"
          className="catalog-btn catalog-btn--primario"
          onClick={acaoPrincipal}
        >
          {rotuloPrincipal}
        </button>
        {acaoSecundaria ? (
          <button
            type="button"
            className="catalog-btn catalog-btn--secundario"
            disabled={desabilitado}
            onClick={(event) => {
              event.stopPropagation();
              acaoSecundaria();
            }}
          >
            {rotuloSecundario}
          </button>
        ) : null}
      </div>
    </article>
  );
}
