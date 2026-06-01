-- Correção completa: políticas RLS (008) + alinhar user_id (007).
-- Comparar sempre em text (auth.uid()::text = user_id::text) para uuid ou text na coluna.
-- Cole no SQL Editor do Supabase (Run) ou: npm run db:fix-evolucoes-supabase

drop policy if exists "evolucoes_select_own" on public.evolucoes;
drop policy if exists "evolucoes_insert_own" on public.evolucoes;
drop policy if exists "evolucoes_update_own" on public.evolucoes;
drop policy if exists "evolucoes_delete_own" on public.evolucoes;

create policy "evolucoes_select_own"
  on public.evolucoes for select
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
  );

create policy "evolucoes_insert_own"
  on public.evolucoes for insert
  with check (
    exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
    and (user_id is null or user_id::text = auth.uid()::text)
  );

create policy "evolucoes_update_own"
  on public.evolucoes for update
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
    exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
    and (user_id is null or user_id::text = auth.uid()::text)
  );

create policy "evolucoes_delete_own"
  on public.evolucoes for delete
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1
      from public.pacientes p
      where p.user_id::text = auth.uid()::text
        and p.id::text = paciente_id::text
    )
  );

UPDATE public.evolucoes AS e
SET user_id = (p.user_id::text)::uuid
FROM public.pacientes AS p
WHERE p.user_id IS NOT NULL
  AND e.paciente_id::text = p.id::text
  AND e.user_id::text IS DISTINCT FROM p.user_id::text;
