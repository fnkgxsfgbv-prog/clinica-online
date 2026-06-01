export type CidPsicologia = {
  codigo: string;
  nome: string;
  grupo: string;
};

export const CID_PSICOLOGIA_OPCOES: CidPsicologia[] = [
  { codigo: "F06.3", nome: "Transtornos do humor orgânicos", grupo: "Orgânicos" },
  { codigo: "F06.4", nome: "Transtorno orgânico de ansiedade", grupo: "Orgânicos" },
  { codigo: "F07.0", nome: "Transtorno orgânico da personalidade", grupo: "Orgânicos" },
  { codigo: "F10.2", nome: "Síndrome de dependência de álcool", grupo: "Substâncias" },
  { codigo: "F12.2", nome: "Síndrome de dependência de canabinoides", grupo: "Substâncias" },
  { codigo: "F14.2", nome: "Síndrome de dependência de cocaína", grupo: "Substâncias" },
  { codigo: "F19.2", nome: "Dependência de múltiplas drogas e outras substâncias", grupo: "Substâncias" },
  { codigo: "F20.0", nome: "Esquizofrenia paranoide", grupo: "Psicóticos" },
  { codigo: "F20.9", nome: "Esquizofrenia não especificada", grupo: "Psicóticos" },
  { codigo: "F23.0", nome: "Transtorno psicótico agudo polimorfo", grupo: "Psicóticos" },
  { codigo: "F25.0", nome: "Transtorno esquizoafetivo do tipo maníaco", grupo: "Psicóticos" },
  { codigo: "F25.1", nome: "Transtorno esquizoafetivo do tipo depressivo", grupo: "Psicóticos" },
  { codigo: "F30.0", nome: "Hipomania", grupo: "Humor" },
  { codigo: "F31.0", nome: "Transtorno afetivo bipolar, episódio atual hipomaníaco", grupo: "Humor" },
  { codigo: "F31.3", nome: "Transtorno afetivo bipolar, episódio atual depressivo leve ou moderado", grupo: "Humor" },
  { codigo: "F31.9", nome: "Transtorno afetivo bipolar não especificado", grupo: "Humor" },
  { codigo: "F32.0", nome: "Episódio depressivo leve", grupo: "Humor" },
  { codigo: "F32.1", nome: "Episódio depressivo moderado", grupo: "Humor" },
  { codigo: "F32.2", nome: "Episódio depressivo grave sem sintomas psicóticos", grupo: "Humor" },
  { codigo: "F32.9", nome: "Episódio depressivo não especificado", grupo: "Humor" },
  { codigo: "F33.0", nome: "Transtorno depressivo recorrente, episódio atual leve", grupo: "Humor" },
  { codigo: "F33.1", nome: "Transtorno depressivo recorrente, episódio atual moderado", grupo: "Humor" },
  { codigo: "F33.2", nome: "Transtorno depressivo recorrente, episódio atual grave sem sintomas psicóticos", grupo: "Humor" },
  { codigo: "F33.9", nome: "Transtorno depressivo recorrente não especificado", grupo: "Humor" },
  { codigo: "F34.0", nome: "Ciclotimia", grupo: "Humor" },
  { codigo: "F34.1", nome: "Distimia", grupo: "Humor" },
  { codigo: "F40.0", nome: "Agorafobia", grupo: "Ansiedade" },
  { codigo: "F40.1", nome: "Fobias sociais", grupo: "Ansiedade" },
  { codigo: "F40.2", nome: "Fobias específicas", grupo: "Ansiedade" },
  { codigo: "F41.0", nome: "Transtorno de pânico", grupo: "Ansiedade" },
  { codigo: "F41.1", nome: "Ansiedade generalizada", grupo: "Ansiedade" },
  { codigo: "F41.2", nome: "Transtorno misto ansioso e depressivo", grupo: "Ansiedade" },
  { codigo: "F41.9", nome: "Transtorno ansioso não especificado", grupo: "Ansiedade" },
  { codigo: "F42.0", nome: "Transtorno obsessivo-compulsivo com ideias obsessivas predominantes", grupo: "Ansiedade" },
  { codigo: "F42.1", nome: "Transtorno obsessivo-compulsivo com atos compulsivos predominantes", grupo: "Ansiedade" },
  { codigo: "F42.2", nome: "Transtorno obsessivo-compulsivo misto", grupo: "Ansiedade" },
  { codigo: "F43.0", nome: "Reação aguda ao estresse", grupo: "Estresse e trauma" },
  { codigo: "F43.1", nome: "Estado de estresse pós-traumático", grupo: "Estresse e trauma" },
  { codigo: "F43.2", nome: "Transtornos de adaptação", grupo: "Estresse e trauma" },
  { codigo: "F44.0", nome: "Amnésia dissociativa", grupo: "Dissociativos" },
  { codigo: "F44.4", nome: "Transtornos dissociativos do movimento", grupo: "Dissociativos" },
  { codigo: "F45.0", nome: "Transtorno de somatização", grupo: "Somatoformes" },
  { codigo: "F45.2", nome: "Transtorno hipocondríaco", grupo: "Somatoformes" },
  { codigo: "F45.9", nome: "Transtorno somatoforme não especificado", grupo: "Somatoformes" },
  { codigo: "F50.0", nome: "Anorexia nervosa", grupo: "Alimentares" },
  { codigo: "F50.2", nome: "Bulimia nervosa", grupo: "Alimentares" },
  { codigo: "F51.0", nome: "Insônia não orgânica", grupo: "Sono" },
  { codigo: "F51.2", nome: "Transtorno do ciclo vigília-sono não orgânico", grupo: "Sono" },
  { codigo: "F52.0", nome: "Ausência ou perda do desejo sexual", grupo: "Sexualidade" },
  { codigo: "F60.3", nome: "Transtorno de personalidade emocionalmente instável", grupo: "Personalidade" },
  { codigo: "F60.4", nome: "Transtorno de personalidade histriônica", grupo: "Personalidade" },
  { codigo: "F60.5", nome: "Transtorno de personalidade anancástica", grupo: "Personalidade" },
  { codigo: "F60.6", nome: "Transtorno de personalidade ansiosa", grupo: "Personalidade" },
  { codigo: "F60.7", nome: "Transtorno de personalidade dependente", grupo: "Personalidade" },
  { codigo: "F63.0", nome: "Jogo patológico", grupo: "Impulsos" },
  { codigo: "F63.2", nome: "Cleptomania", grupo: "Impulsos" },
  { codigo: "F63.3", nome: "Tricotilomania", grupo: "Impulsos" },
  { codigo: "F84.0", nome: "TEA / autismo - Transtorno autístico, incluindo avaliação em adulto", grupo: "Desenvolvimento" },
  { codigo: "F84.1", nome: "Autismo atípico, incluindo apresentação em adulto", grupo: "Desenvolvimento" },
  { codigo: "F84.5", nome: "Síndrome de Asperger / TEA sem deficiência intelectual, comum em adultos", grupo: "Desenvolvimento" },
  { codigo: "F84.9", nome: "TEA / autismo não especificado, incluindo autismo adulto", grupo: "Desenvolvimento" },
  { codigo: "F88", nome: "Atraso global do desenvolvimento / outros transtornos do desenvolvimento psicológico", grupo: "Desenvolvimento" },
  { codigo: "F89", nome: "Transtorno do desenvolvimento psicológico não especificado", grupo: "Desenvolvimento" },
  { codigo: "F90.0", nome: "TDAH - Transtorno do déficit de atenção com hiperatividade", grupo: "Infância e adolescência" },
  { codigo: "F90.1", nome: "TDAH com transtorno hipercinético de conduta", grupo: "Infância e adolescência" },
  { codigo: "F90.8", nome: "Outros transtornos hipercinéticos / TDAH", grupo: "Infância e adolescência" },
  { codigo: "F90.9", nome: "Transtorno hipercinético não especificado / TDAH", grupo: "Infância e adolescência" },
  { codigo: "F91.3", nome: "Transtorno opositor desafiante", grupo: "Infância e adolescência" },
  { codigo: "F92.0", nome: "Transtorno depressivo de conduta", grupo: "Infância e adolescência" },
  { codigo: "F93.0", nome: "Transtorno ligado à angústia de separação", grupo: "Infância e adolescência" },
  { codigo: "F93.1", nome: "Transtorno fóbico ansioso da infância", grupo: "Infância e adolescência" },
  { codigo: "F94.0", nome: "Mutismo eletivo", grupo: "Infância e adolescência" },
  { codigo: "F98.0", nome: "Enurese de origem não orgânica", grupo: "Infância e adolescência" },
  { codigo: "F98.5", nome: "Gagueira", grupo: "Infância e adolescência" },
  { codigo: "R62.0", nome: "Atraso no desenvolvimento / marcos do desenvolvimento atrasados", grupo: "Desenvolvimento" },
  { codigo: "Z55.9", nome: "Problema relacionado com educação e alfabetização", grupo: "Fatores psicossociais" },
  { codigo: "Z60.0", nome: "Problemas de adaptação às transições do ciclo de vida", grupo: "Fatores psicossociais" },
  { codigo: "Z63.0", nome: "Problemas de relacionamento com cônjuge ou parceiro", grupo: "Fatores psicossociais" },
  { codigo: "Z63.4", nome: "Desaparecimento ou falecimento de membro da família", grupo: "Fatores psicossociais" },
  { codigo: "Z73.0", nome: "Esgotamento", grupo: "Fatores psicossociais" },
  { codigo: "Z73.3", nome: "Estresse não classificado em outra parte", grupo: "Fatores psicossociais" },
];

export function formatarCidOpcao(opcao: CidPsicologia) {
  return `${opcao.codigo} - ${opcao.nome}`;
}

export function extrairCodigosCid(valor?: string | null) {
  if (!valor) return [];

  const codigos = String(valor).match(/[A-Z]\d{2}(?:\.\d)?/gi) || [];
  return Array.from(
    new Set(codigos.map((codigo) => codigo.toUpperCase()))
  );
}

export function formatarCidsParaSalvar(codigos: string[]) {
  return Array.from(new Set(codigos.map((codigo) => codigo.trim()).filter(Boolean)))
    .join(", ");
}

export function formatarCidParaExibicao(valor?: string | null) {
  const codigos = extrairCodigosCid(valor);
  return codigos.length > 0 ? codigos.join(", ") : "-";
}
