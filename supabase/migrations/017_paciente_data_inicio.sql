-- Data de início do atendimento como coluna própria (antes ficava nas observações).

alter table public.pacientes
  add column if not exists data_inicio_atendimento date;

update public.pacientes
set data_inicio_atendimento = (
  regexp_match(observacoes, '\[DATA_INICIO_ATENDIMENTO:(\d{4}-\d{2}-\d{2})\]')
)[1]::date
where data_inicio_atendimento is null
  and observacoes ~ '\[DATA_INICIO_ATENDIMENTO:\d{4}-\d{2}-\d{2}\]';
