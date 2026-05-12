interface Props {
  titulo?: string;
  children: React.ReactNode;
}

export default function Janela({ titulo, children }: Props) {
  return (
    <section className="janela-premium">
      {titulo && (
        <div className="janela-header">
          <h1>{titulo}</h1>
        </div>
      )}

      <div className="janela-content">{children}</div>
    </section>
  );
}