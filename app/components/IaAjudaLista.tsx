type Props = {
  itens: readonly string[];
  className?: string;
};

export default function IaAjudaLista({ itens, className = "" }: Props) {
  if (!itens.length) return null;

  return (
    <ul className={`ia-ajuda-lista${className ? ` ${className}` : ""}`}>
      {itens.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
