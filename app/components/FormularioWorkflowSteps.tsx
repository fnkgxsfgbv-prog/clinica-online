export default function FormularioWorkflowSteps({
  contexto,
}: {
  contexto: "modelo" | "paciente";
}) {
  const passos =
    contexto === "modelo"
      ? [
          {
            titulo: "Monte o modelo",
            texto: "Aqui você define perguntas e orientações — não preenche o paciente.",
          },
          {
            titulo: "Salve o modelo",
            texto: "Clique em Salvar formulário para usar em qualquer paciente.",
          },
          {
            titulo: "Preencha na ficha",
            texto: "Abra o paciente → aba Formulários → use o modelo e salve em Documentos.",
          },
        ]
      : [
          {
            titulo: "Escolha o modelo",
            texto: "Clique em Anamnese TEA — 9 anos (ou outro modelo) e depois em Carregar modelo.",
          },
          {
            titulo: "Escreva aqui",
            texto: "Preencha as respostas em cada campo abaixo durante a entrevista.",
          },
          {
            titulo: "Salve na pasta",
            texto: "Salvar na pasta do paciente grava o formulário e um .txt em Documentos.",
          },
        ];

  return (
    <ol className="formulario-workflow-steps" aria-label="Como usar formulários">
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
