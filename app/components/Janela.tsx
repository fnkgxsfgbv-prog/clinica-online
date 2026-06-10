interface Props {
  titulo?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
}

export default function Janela({ titulo, acoes, children }: Props) {
  return (
    <section className="janela-premium">
      {titulo ? (
        <div className="janela-header">
          <h1>{titulo}</h1>
          {acoes ? <div className="janela-header-acoes">{acoes}</div> : null}
        </div>
      ) : null}

      <div className="janela-content">{children}</div>
    </section>
  );
}