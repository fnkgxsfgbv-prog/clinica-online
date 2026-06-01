-- Sessões: permitir ver/excluir/atualizar pelo dono do paciente (como evoluções).
-- Corrige sessões antigas com user_id nulo ou inconsistente que "voltam" após excluir na UI.

drop policy if exists "sessoes_select_own" on public.sessoes;
drop policy if exists "sessoes_delete_own" on public.sessoes;
drop policy if exists "sessoes_update_own" on public.sessoes;

create policy "sessoes_select_own"
  on public.sessoes for select
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
  );

create policy "sessoes_update_own"
  on public.sessoes for update
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
  )
  with check (
    auth.uid()::text = user_id::text
    or exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
  );

create policy "sessoes_delete_own"
  on public.sessoes for delete
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
  );

update public.sessoes s
set user_id = p.user_id::uuid
from public.pacientes p
where s.user_id is null
  and s.paciente_id::text = p.id::text
  and p.user_id is not null;
