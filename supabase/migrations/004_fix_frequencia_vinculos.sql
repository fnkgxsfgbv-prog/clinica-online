-- Alinha user_id e paciente_id em frequência (dados legados).

update public."frequência" f
set user_id = p.user_id
from public.pacientes p
where f.paciente_id = p.id
  and (f.user_id is distinct from p.user_id);

update public."frequência" f
set paciente_id = p.id,
    user_id = p.user_id
from public.pacientes p
where f.paciente_id is null
  and f.paciente_nome is not null
  and lower(trim(f.paciente_nome)) = lower(trim(p.nome));

update public."frequência" f
set sessao_id = s.id
from public.sessoes s
where f.sessao_id is null
  and f.paciente_id = s.paciente_id
  and f.data::date = s.data::date
  and lower(trim(f.status)) = lower(trim(s.status));
