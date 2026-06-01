-- Permite editar, criar e remover campos do questionário de anamnese.

alter table public.paciente_anamnese
  add column if not exists campos jsonb not null default '[]'::jsonb;
