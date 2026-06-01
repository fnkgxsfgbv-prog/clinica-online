-- Nome editável do formulário de anamnese.

alter table public.paciente_anamnese
  add column if not exists nome_formulario text not null default 'Anamnese do paciente';
