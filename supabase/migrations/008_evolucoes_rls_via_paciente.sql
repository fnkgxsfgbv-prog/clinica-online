-- Evoluções: dono da linha (user_id) ou dono do paciente.
-- Comparar auth.uid() e colunas user_id sempre em text (uuid ou text na tabela).

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
