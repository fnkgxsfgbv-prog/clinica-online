export type Paciente = {
  id: number | string;
  user_id?: string | null;
  nome: string;
  data_nascimento?: string | null;
  data_inicio_atendimento?: string | null;
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

export type PacienteDocumento = {
  id: number | string;
  user_id?: string | null;
  paciente_id: number | string;
  nome_arquivo: string;
  storage_path: string;
  tipo_mime?: string | null;
  tamanho_bytes?: number | null;
  created_at?: string | null;
};

export type PacienteAnamnese = {
  id: number | string;
  user_id?: string | null;
  paciente_id: number | string;
  nome_formulario?: string | null;
  campos?: AnamneseCampo[] | null;
  queixa_principal?: string | null;
  motivo_consulta?: string | null;
  historia_atual?: string | null;
  historico_psicologico?: string | null;
  historico_psiquiatrico?: string | null;
  historico_medico?: string | null;
  medicamentos?: string | null;
  alergias?: string | null;
  historico_familiar?: string | null;
  desenvolvimento_infancia?: string | null;
  sono?: string | null;
  alimentacao?: string | null;
  rotina?: string | null;
  trabalho_estudos?: string | null;
  relacionamentos?: string | null;
  uso_substancias?: string | null;
  risco?: string | null;
  objetivos_terapia?: string | null;
  observacoes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AnamneseCampo = {
  id: string;
  titulo: string;
  placeholder?: string;
  resposta: string;
};

export type DocumentoModelo = {
  id: number | string;
  user_id?: string | null;
  nome: string;
  categoria: string;
  conteudo: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FormularioModelo = {
  id: number | string;
  user_id?: string | null;
  nome: string;
  descricao?: string | null;
  campos: AnamneseCampo[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type ModeloArquivo = {
  id: number | string;
  user_id?: string | null;
  tipo: "documento" | "formulario";
  nome_arquivo: string;
  storage_path: string;
  tipo_mime?: string | null;
  tamanho_bytes?: number | null;
  created_at?: string | null;
};

export type PacienteFormulario = {
  id: number | string;
  user_id?: string | null;
  paciente_id: number | string;
  modelo_id?: number | string | null;
  nome_formulario: string;
  campos: AnamneseCampo[];
  created_at?: string | null;
  updated_at?: string | null;
};
