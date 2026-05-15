export type Paciente = {
  id: number | string;
  user_id?: string | null;
  nome: string;
  data_nascimento?: string | null;
  telefone?: string | null;
  convenio?: string | null;
  cid?: string | null;
  valor?: number | string | null;
  valor_sessao?: number | string | null;
  status?: string | null;
  responsavel?: string | null;
  diagnostico?: string | null;
  observacoes?: string | null;
};

export type Sessao = {
  id: number | string;
  user_id?: string | null;
  paciente_id: number | string;
  paciente_nome?: string | null;
  data: string;
  hora?: string | null;
  valor?: number | string | null;
  status?: string | null;
  status_pagamento?: string | null;
  forma_pagamento?: string | null;
};

export type Frequencia = {
  id: number | string;
  user_id?: string | null;
  sessao_id?: number | string | null;
  paciente_id?: number | string | null;
  paciente_nome?: string | null;
  data?: string | null;
  status?: string | null;
};

export type Evolucao = {
  id: number | string;
  user_id?: string | null;
  sessao_id?: number | string | null;
  paciente_id?: number | string | null;
  data?: string | null;
  humor?: string | null;
  status_sessao?: string | null;
  queixa?: string | null;
  objetivo?: string | null;
  intervencao?: string | null;
  observacoes?: string | null;
  plano?: string | null;
  encaminhamentos?: string | null;
};
