-- Sincroniza frequência com sessões já marcadas (presente/faltou).
-- Pré-requisito: 003_add_sessao_id_frequencia.sql (coluna sessao_id).

-- 1) Corrige user_id em registros antigos (via paciente)
update public."frequência" f
set user_id = p.user_id
from public.pacientes p
where f.paciente_id = p.id
  and (f.user_id is null or f.user_id <> p.user_id);

-- 2) Vincula sessao_id onde ainda está vazio
update public."frequência" f
set sessao_id = s.id
from public.sessoes s
where f.sessao_id is null
  and f.paciente_id = s.paciente_id
  and f.data::date = s.data::date
  and lower(trim(f.status)) = lower(trim(s.status));

-- 3) Cria frequência para sessões Presente/Faltou sem linha
insert into public."frequência" (
  user_id,
  sessao_id,
  paciente_id,
  paciente_nome,
  data,
  status
)
select
  s.user_id,
  s.id,
  s.paciente_id,
  s.paciente_nome,
  s.data,
  s.status
from public.sessoes s
where lower(trim(s.status)) in ('presente', 'faltou')
  and not exists (
    select 1
    from public."frequência" f
    where f.sessao_id = s.id
  );
