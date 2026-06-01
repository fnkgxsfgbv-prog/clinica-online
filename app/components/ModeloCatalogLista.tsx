export type ModeloCatalogItem = {
  id: string | number;
  titulo: string;
  meta?: string;
  onEditar: () => void;
  onExcluir?: () => void;
};

export default function ModeloCatalogLista({
  tituloSecao,
  vazio,
  itens,
}: {
  tituloSecao: string;
  vazio?: string;
  itens: ModeloCatalogItem[];
}) {
  if (itens.length === 0) {
    return vazio ? (
      <section className="catalog-secao">
        <h3 className="catalog-secao-titulo">{tituloSecao}</h3>
        <p className="catalog-vazio">{vazio}</p>
      </section>
    ) : null;
  }

  return (
    <section className="catalog-secao">
      {tituloSecao ? (
        <h3 className="catalog-secao-titulo">{tituloSecao}</h3>
      ) : null}
      <ul className="catalog-lista">
        {itens.map((item) => (
          <li key={item.id} className="catalog-lista-item">
            <button
              type="button"
              className="catalog-lista-corpo"
              onClick={item.onEditar}
            >
              <span className="catalog-lista-titulo">{item.titulo}</span>
              {item.meta ? (
                <span className="catalog-lista-meta">{item.meta}</span>
              ) : null}
            </button>
            {item.onExcluir ? (
              <button
                type="button"
                className="catalog-lista-excluir"
                title={`Excluir ${item.titulo}`}
                aria-label={`Excluir ${item.titulo}`}
                onClick={item.onExcluir}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
