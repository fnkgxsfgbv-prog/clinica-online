export const AJUDA_SEGUIMENTO_SESSAO = [
  "Resumo automático: organiza o plano no seu navegador, sem enviar dados à internet.",
  "Gerar com IA: envia trechos do plano (e, se existir, resumo da última evolução) à Vercel AI Gateway.",
  "Nada é gerado ao abrir a sessão — você escolhe quando pedir lembretes.",
  "Lembretes ficam em cache nesta aba do navegador enquanto o plano não mudar.",
  "Regenerar força uma nova sugestão com IA, ignorando o cache.",
] as const;

export const AJUDA_PRIVACIDADE_IA = [
  "Só funciona com o toggle ativado em Minha clínica.",
  "Não enviamos o nome completo do paciente nos prompts de IA.",
  "Podemos incluir data da sessão, trechos do plano e resumo clínico da evolução anterior.",
  "Importação de PDF e lembretes usam a mesma infraestrutura (Vercel AI Gateway).",
  "Sugestões da IA não substituem julgamento clínico; desative quando quiser.",
] as const;
