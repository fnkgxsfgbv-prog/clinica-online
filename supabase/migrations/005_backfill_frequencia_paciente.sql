-- Vincula frequência aos pacientes pelo nome e preenche data via sessão.

update public."frequência" f
set paciente_id = p.id,
    user_id = p.user_id
from public.pacientes p
where f.paciente_nome is not null
  and lower(trim(f.paciente_nome)) = lower(trim(p.nome))
  and (f.paciente_id is distinct from p.id or f.paciente_id is null);

update public."frequência" f
set paciente_nome = p.nome
from public.pacientes p
where f.paciente_id = p.id
  and (f.paciente_nome is null or trim(f.paciente_nome) = '');

update public."frequência" f
set data = s.data
from public.sessoes s
where f.sessao_id = s.id
  and (f.data is null or trim(f.data::text) = '');
