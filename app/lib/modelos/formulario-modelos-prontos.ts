import type { AnamneseCampo, FormularioModelo } from "../../types";

export type FormularioModeloPronto = {
  nome: string;
  descricao: string;
  campos: Omit<AnamneseCampo, "resposta">[];
};

function campo(
  id: string,
  titulo: string,
  placeholder: string
): Omit<AnamneseCampo, "resposta"> {
  return { id, titulo, placeholder };
}

export const ANAMNESE_TEA_INFANTIL_CAMPOS: Omit<AnamneseCampo, "resposta">[] = [
  campo(
    "entrevistado",
    "Quem participou da entrevista",
    "Nome, parentesco ou vínculo com a criança, idade do informante, quem acompanhou na consulta..."
  ),
  campo(
    "queixa_principal",
    "Queixa principal",
    "O que a família ou escola mais preocupa hoje? Descreva com as palavras dos cuidadores."
  ),
  campo(
    "motivo_consulta",
    "Motivo da consulta e encaminhamento",
    "Demanda atual, quem encaminhou, há quanto tempo buscam avaliação ou acompanhamento..."
  ),
  campo(
    "idade_inicio_sinais",
    "Idade de início dos sinais",
    "Quando os cuidadores notaram as primeiras preocupações? Antes dos 12 meses, entre 12 e 24, após 24 meses..."
  ),
  campo(
    "evolucao_sinais",
    "Evolução dos sinais ao longo do tempo",
    "Os comportamentos aumentaram, estabilizaram ou diminuíram? Houve regressão em linguagem ou habilidades?"
  ),
  campo(
    "gravidez_parto",
    "Gravidez, parto e período neonatal",
    "Gestação planejada, intercorrências, prematuridade, APGAR, internação, icterícia, convulsões..."
  ),
  campo(
    "marcos_desenvolvimento",
    "Marcos do desenvolvimento",
    "Sustentar a cabeça, sentar, engatinhar, andar, primeiras palavras, frases. Atrasos ou assimetrias?"
  ),
  campo(
    "linguagem_comunicacao",
    "Linguagem e comunicação",
    "Balbucio, ecolalia, fala funcional, pedidos, gestos, apontar, PECS, Libras, perda de fala..."
  ),
  campo(
    "contato_visual_social",
    "Contato visual e interação social",
    "Olha nos olhos, responde ao nome, interesse em outras crianças, brincadeiras compartilhadas, afeto..."
  ),
  campo(
    "brincar_imaginacao",
    "Brincar e imaginação",
    "Brincadeira simbólica, uso de objetos como personagens, interesse em brinquedos, brincar ao lado ou junto..."
  ),
  campo(
    "interesses_repetitivos",
    "Interesses restritos e comportamentos repetitivos",
    "Estereotipias motoras, rotinas rígidas, interesses intensos, insistência em igualdade, linhas de brinquedos..."
  ),
  campo(
    "sensorialidade",
    "Reações sensoriais",
    "Hipersensibilidade ou hipossensibilidade a sons, luzes, texturas, cheiros, toque, movimento, dor..."
  ),
  campo(
    "rotina_transicoes",
    "Rotina diária e transições",
    "Previsibilidade, dificuldade com mudanças, crises em transições, uso de antecipação visual ou cronograma..."
  ),
  campo(
    "sono",
    "Sono",
    "Hora de dormir, despertares, insônia, ritual de sono, compartilha cama, sonolência diurna..."
  ),
  campo(
    "alimentacao",
    "Alimentação",
    "Seletividade alimentar, texturas recusadas, ritual alimentar, ganho de peso, restrições médicas..."
  ),
  campo(
    "escola_inclusao",
    "Escola e inclusão",
    "Série, tipo de escola, adaptações, professor de apoio, bullying, desempenho, adaptação social na escola..."
  ),
  campo(
    "comportamento_casa",
    "Comportamento em casa",
    "Crises, birras, agressividade, autolesão, fuga, obediência, limites, uso de telas..."
  ),
  campo(
    "comportamento_fora",
    "Comportamento fora de casa",
    "Supermercado, consultórios, transporte, eventos sociais, o que facilita ou desorganiza..."
  ),
  campo(
    "historico_familiar",
    "Histórico familiar",
    "Composição familiar, vínculos, TEA ou neurodesenvolvimento na família, conflitos, rede de apoio..."
  ),
  campo(
    "gestacao_cuidado",
    "Gestação do cuidado e vínculo",
    "Quem é o cuidador principal, como a família organiza rotina, sobrecarga, expectativas em relação à criança..."
  ),
  campo(
    "avaliacoes_previas",
    "Avaliações e laudos anteriores",
    "Neuropediatra, psicólogo, fonoaudiólogo, TO, psicopedagogo, datas, instrumentos (M-CHAT, ADOS, etc.)..."
  ),
  campo(
    "diagnosticos_laudos",
    "Diagnósticos e CID informados",
    "TEA, TDAH, deficiência intelectual, atraso global, outros. Quem emitiu e quando?"
  ),
  campo(
    "tratamentos_atuais",
    "Tratamentos e terapias em curso",
    "Frequência, profissional, escola, tempo de acompanhamento, percepção de evolução..."
  ),
  campo(
    "medicamentos",
    "Medicamentos",
    "Nome, dose, indicação, efeitos colaterais observados, adesão..."
  ),
  campo(
    "historico_medico",
    "Histórico médico relevante",
    "Epilepsia, alergias, síndromes genéticas, internações, exames recentes..."
  ),
  campo(
    "nivel_funcionamento",
    "Nível de funcionamento atual",
    "Autonomia para higiene, vestir, alimentar-se, comunicar necessidades, segurança, supervisão necessária..."
  ),
  campo(
    "pontos_fortes",
    "Pontos fortes e interesses da criança",
    "Habilidades preservadas, talentos, o que motiva a criança, estratégias que já funcionam..."
  ),
  campo(
    "objetivos_familia",
    "Objetivos da família para o acompanhamento",
    "O que os cuidadores mais desejam melhorar: comunicação, escola, comportamento, autonomia, vínculo..."
  ),
  campo(
    "objetivos_profissional",
    "Hipóteses e objetivos terapêuticos iniciais",
    "Foco clínico pretendido, prioridades da avaliação, necessidade de articulação com escola ou equipe..."
  ),
  campo(
    "observacoes_entrevista",
    "Observações clínicas na entrevista",
    "Comportamento na sessão, regulação emocional, adaptação ao setting, rapport com cuidadores..."
  ),
];

export const ANAMNESE_TEA_9_ANOS_CAMPOS: Omit<AnamneseCampo, "resposta">[] = [
  campo(
    "identificacao",
    "Identificação",
    "Nome, 9 anos, sexo, cidade, quem trouxe (mãe, pai, avó), se a criança participou da conversa..."
  ),
  campo(
    "queixa_principal",
    "Queixa principal",
    "Em 1–2 frases: o que mais preocupa hoje? Crises? Escola? Comunicação? Desde quando piorou ou mudou?"
  ),
  campo(
    "motivo_consulta",
    "Motivo desta consulta",
    "Primeira avaliação, retorno, laudo, orientação escolar, crise recente, troca de terapeuta..."
  ),
  campo(
    "diagnostico_tea",
    "Diagnóstico de autismo (TEA)",
    "CID (ex. F84.0), data do laudo, profissional que diagnosticou, nível de suporte 1/2/3, grau de funcionamento..."
  ),
  campo(
    "instrumentos_avaliacao",
    "Instrumentos já aplicados",
    "ADOS-2, M-CHAT, Raven, WISC, escalas adaptadas — data, resultado resumido, onde foi feito..."
  ),
  campo(
    "idade_primeiros_sinais",
    "Primeiros sinais de autismo",
    "Antes dos 2 anos? Perda de palavras? Não apontar, não responder ao nome, pouco contato visual, linha de brinquedos..."
  ),
  campo(
    "regressao_historica",
    "Regressão ou perda de habilidades",
    "Houve perda de fala, brincar ou habilidades sociais? Em que idade? Gatilho conhecido (irmão, mudança, escola)?"
  ),
  campo(
    "contato_visual",
    "Contato visual e atenção compartilhada",
    "Olha nos olhos com família/estranhos? Compartilha interesse (mostra brinquedo, comenta)? Responde ao nome na 1ª chamada?"
  ),
  campo(
    "comunicacao_funcional",
    "Comunicação funcional hoje",
    "Consegue pedir água, comida, banheiro sem chorar? Usa frases completas, palavras isoladas, gestos ou só leva pelo braço?"
  ),
  campo(
    "ecolalia",
    "Ecolalia e repetição de fala",
    "Repete frases de desenho/YouTube? Ecolalia imediata ou tardia? Usa repetição para se comunicar ou só ecoa?"
  ),
  campo(
    "pragmatica_linguagem",
    "Uso social da linguagem",
    "Inicia conversa? Mantém assunto? Entende piadas, ironia ou tom de voz? Fala “no tom” ou muito formal/infantil?"
  ),
  campo(
    "caa_recursos",
    "CAA e recursos de comunicação",
    "Usa PECS, prancha, app, Libras? Tem na escola e em casa? A criança generaliza ou só usa com um adulto?"
  ),
  campo(
    "compreensao_instrucoes",
    "Compreensão de instruções",
    "Entende comandos de 1, 2 ou 3 passos? Precisa de apoio visual? Confunde “não” com ordem negativa?"
  ),
  campo(
    "interesses_restritos",
    "Interesses restritos e intensos",
    "Tema fixo (dinossauros, trens, números, Minecraft)? Horas por dia no tema? Interromper gera crise?"
  ),
  campo(
    "estereotipias_motoras",
    "Estereotipias e movimentos repetitivos",
    "Balançar, rodar, bater mãos, andar na ponta, organizar objetos em fila — quando aparecem e por quanto tempo?"
  ),
  campo(
    "rigidez_rotina",
    "Rigidez de rotina",
    "Mesmo caminho, mesma roupa, mesmo prato? Reação a feriado, visita, professor substituto, horário diferente?"
  ),
  campo(
    "sensorial_auditivo",
    "Sensorial — sons",
    "Tampões, fogos, sirene, canto coletivo na escola, secador, aspirador — evita, fuga ou mãos no ouvido?"
  ),
  campo(
    "sensorial_tato_vestuario",
    "Sensorial — toque e roupa",
    "Etiqueta, tipo de tecido, corte de unha, cabelo, dentista, abraço — hiper ou hiporressponsivo?"
  ),
  campo(
    "sensorial_alimentar",
    "Sensorial — alimentação",
    "Recusa por textura, cor, mistura? Aceita só marcas específicas? Come em escola ou só em casa?"
  ),
  campo(
    "sensorial_visual",
    "Sensorial — luzes e visual",
    "Incômodo com luz forte, pisca-pisca, telas muito perto, não tolera olhar para certas imagens?"
  ),
  campo(
    "busca_sensorial",
    "Busca sensorial (procurar estímulo)",
    "Corre, pula, aperta, esfrega, cheira objetos, busca movimento ou pressão (cobertor pesado, abraço forte)?"
  ),
  campo(
    "meltdown_gatilhos",
    "Crises (meltdown) — gatilhos",
    "O que costuma disparar: barulho, espera, perder no jogo, mudança de plano, demanda escolar, cansaço?"
  ),
  campo(
    "meltdown_manifestacao",
    "Crises — como se manifestam",
    "Choro, gritos, agressão, autolesão, fuga, shutdown (trava)? Duração média? Precisa de espaço calmo?"
  ),
  campo(
    "shutdown",
    "Shutdown (bloqueio)",
    "Fica mudo, parado, não responde? Após qual tipo de estresse? Quanto tempo para “voltar”?"
  ),
  campo(
    "estrategias_regulacao",
    "O que ajuda a se acalmar",
    "Cobertor, fone, canto, objeto favorito, passeio, pressão, rotina fixa pós-crise — o que já testaram?"
  ),
  campo(
    "mascaramento_escola",
    "Mascaramento (camuflagem) na escola",
    "Em casa desaba após escola? Professora diz que “é tranquilo” mas em casa há crises? Segura comportamento na escola?"
  ),
  campo(
    "amizades_pares",
    "Amizades e colegas",
    "Tem amigo fixo? É convidado para festas? Brinca em casa de colega ou só paralelo na escola? É excluído ou isolado?"
  ),
  campo(
    "bullying_exclusao",
    "Bullying, zoação ou exclusão",
    "Apelidos, imitação de jeito de falar, roubo de material, violência — relato da escola ou da criança?"
  ),
  campo(
    "brincar_nove_anos",
    "Brincar aos 9 anos",
    "Brincadeira imaginária, RPG, esporte, videogame solo? Compartilha brinquedo ou só empresta se for obrigado?"
  ),
  campo(
    "pensamento_literal",
    "Pensamento literal e regras",
    "Exemplos: entende sarcasmo? Obcecado por “regra justa”? Explosão quando alguém “quebra combinado”?"
  ),
  campo(
    "tdah_ansiedade_tea",
    "TDAH, ansiedade ou TOC junto ao TEA",
    "Inquietude, desatenção, medos fixos, rituais (contar, lavar mãos), checagem — já avaliado ou medicado?"
  ),
  campo(
    "funcoes_executivas",
    "Funções executivas",
    "Perde material, não anota tarefa, demora para começar lição, desiste no meio, troca de atividade é difícil?"
  ),
  campo(
    "escola_serie_pei",
    "Escola — série e documentos",
    "4º ano? Escola regular com inclusão ou especial? Tem PEI/IEP, laudo na escola, reunião com equipe?"
  ),
  campo(
    "escola_apoio",
    "Escola — apoios recebidos",
    "Professor auxiliar, sala de recursos, adaptação de prova, tempo extra, cópia de quadro, material visual?"
  ),
  campo(
    "escola_desempenho",
    "Escola — desempenho por área",
    "Português, matemática, leitura em voz alta, trabalho em grupo, educação física, artes — onde vai bem e mal?"
  ),
  campo(
    "escola_comportamento",
    "Escola — comportamento relatado",
    "Sai da sala, bate mesa, não obedece, chora, recusa tarefa — frequência e o que a escola já tentou?"
  ),
  campo(
    "autonomia_higiene",
    "Autonomia — higiene e autocuidado",
    "Escova dentes, banho, cabelo, unhas, troca de roupa, menstruação se aplicável — com supervisão ou sozinho?"
  ),
  campo(
    "autonomia_alimentacao_vestir",
    "Autonomia — comer e vestir",
    "Come sozinho com talheres? Veste-se sem ajuda? Prefere sempre as mesmas peças?"
  ),
  campo(
    "seguranca_fuga",
    "Segurança e risco de fuga",
    "Já saiu correndo (estacionamento, rua)? Precisa de tranca, identificação, monitor — medo de elopement?"
  ),
  campo(
    "sono_autismo",
    "Sono",
    "Demora para dormir, acorda muito, sono agitado, só dorme com adulto, celular/tablet antes de dormir?"
  ),
  campo(
    "telas_interesse_especial",
    "Telas e interesse especial",
    "Quantas horas/dia? Só um jogo/canal? Crise ao tirar tela? Usa como regulador emocional?"
  ),
  campo(
    "familia_irmaos",
    "Família e irmãos",
    "Irmão neurotípico ou também TEA? Ciúme, agressão entre irmãos, como explicam autismo na casa?"
  ),
  campo(
    "cuidador_sobrecarga",
    "Cuidador principal e sobrecarga",
    "Quem leva terapias, conversa com escola, está mais exausto? Rede de apoio (avós, grupo de pais)?"
  ),
  campo(
    "terapias_equipe",
    "Equipe de tratamento atual",
    "Psicólogo, Fono, TO, psicopedagogo, psiquiatra/neuro — objetivo de cada um, frequência, há quanto tempo?"
  ),
  campo(
    "medicamentos_suplementos",
    "Medicamentos e suplementos",
    "Risperidona, melatonina, metilfenidato, CBD, vitaminas — dose, efeito, efeito colateral..."
  ),
  campo(
    "estrategias_ja_tentadas",
    "Estratégias que já funcionaram ou falharam",
    "Quadro de rotina, timer, reforço positivo, cantinho, fone, social stories — o que a família/escola já usa?"
  ),
  campo(
    "puberdade_autismo",
    "Puberdade e corpo (9–10 anos)",
    "Mudanças corporais explicadas? Higiene íntima, limites com toque, educação sexual adaptada, menstruação se menina..."
  ),
  campo(
    "pontos_fortes_autismo",
    "Pontos fortes da criança autista",
    "Memória, leitura precoce, desenho, música, computador, honestidade, rotina, detalhes — o que orgulha a família?"
  ),
  campo(
    "prioridade_tratamento",
    "Prioridade número 1 do tratamento",
    "Se só pudesse melhorar UMA coisa nos próximos 3 meses: o que seria para família e para escola?"
  ),
  campo(
    "objetivos_familia",
    "Objetivos combinados com a família",
    "Metas concretas: menos crises, pedir com palavras, ir à festa, fazer lição, dormir sozinho..."
  ),
  campo(
    "articulacao_escola",
    "Articulação escola–clínica",
    "Autoriza contato com escola? Professor quer orientação? Precisa de relatório ou participação em reunião?"
  ),
  campo(
    "hipotese_plano",
    "Hipótese clínica e plano inicial",
    "Impressão do profissional, foco (regulação, social, escola), frequência, encaminhamentos, necessidade de laudo..."
  ),
  campo(
    "observacao_consultorio",
    "Observação na consulta (criança autista)",
    "Entrada na sala, estereotipias na sessão, contato visual, resposta ao nome, uso de CAA, regulação, interesse por materiais..."
  ),
];

export const FORMULARIO_MODELOS_PRONTOS: FormularioModeloPronto[] = [
  {
    nome: "Anamnese TEA — 9 anos",
    descricao:
      "Anamnese detalhada para criança de 9 anos com autismo: comunicação, sensorial, crises, escola, mascaramento e equipe.",
    campos: ANAMNESE_TEA_9_ANOS_CAMPOS,
  },
  {
    nome: "Anamnese TEA — Criança",
    descricao:
      "Entrevista inicial estruturada para crianças com suspeita ou diagnóstico de Transtorno do Espectro Autista (TEA).",
    campos: ANAMNESE_TEA_INFANTIL_CAMPOS,
  },
];

export function indiceModeloPronto(nome: string) {
  return FORMULARIO_MODELOS_PRONTOS.findIndex((modelo) => modelo.nome === nome);
}

export function instanciarCamposModeloPronto(
  campos: Omit<AnamneseCampo, "resposta">[]
): AnamneseCampo[] {
  return campos.map((item) => ({
    ...item,
    id: crypto.randomUUID(),
    resposta: "",
  }));
}

export function criarFormularioModeloPronto(
  modelo: FormularioModeloPronto
): Pick<FormularioModelo, "nome" | "descricao" | "campos"> {
  return {
    nome: modelo.nome,
    descricao: modelo.descricao,
    campos: instanciarCamposModeloPronto(modelo.campos),
  };
}
