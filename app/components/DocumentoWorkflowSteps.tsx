export default function DocumentoWorkflowSteps() {
  const passos = [
    {
      titulo: "Escolha o tipo",
      texto: "Recibo, declaração, contrato ou comece em branco.",
    },
    {
      titulo: "Edite o texto",
      texto: "Use os botões para inserir nome, data e valor do paciente.",
    },
    {
      titulo: "Salve o modelo",
      texto: "Depois, na ficha do paciente → Documentos → Gerar documento.",
    },
  ];

  return (
    <ol className="formulario-workflow-steps documento-workflow-steps" aria-label="Como criar um modelo">
      {passos.map((passo, indice) => (
        <li key={passo.titulo} className="formulario-workflow-step">
          <span className="formulario-workflow-step-num">{indice + 1}</span>
          <div>
            <strong>{passo.titulo}</strong>
            <p>{passo.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
