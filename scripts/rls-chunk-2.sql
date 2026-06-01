create policy "frequencia_select_own" on public."frequência" for select using (auth.uid() = user_id);
create policy "frequencia_insert_own" on public."frequência" for insert with check (auth.uid() = user_id);
create policy "frequencia_update_own" on public."frequência" for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "frequencia_delete_own" on public."frequência" for delete using (auth.uid() = user_id);

create policy "evolucoes_select_own" on public.evolucoes for select using (
  auth.uid()::text = user_id::text
  or exists (
    select 1 from public.pacientes p
    where p.user_id::text = auth.uid()::text and p.id::text = paciente_id::text
  )
);
create policy "evolucoes_insert_own" on public.evolucoes for insert with check (
  exists (
    select 1 from public.pacientes p
    where p.user_id::text = auth.uid()::text and p.id::text = paciente_id::text
  )
  and (user_id is null or user_id::text = auth.uid()::text)
);
create policy "evolucoes_update_own" on public.evolucoes for update
  using (
    auth.uid()::text = user_id::text
    or exists (
      select 1 from public.pacientes p
      where p.user_id::text = auth.uid()::text and p.id::text = paciente_id::text
    )
  )
  with check (
    exists (
      select 1 from public.pacientes p
      where p.user_id::text = auth.uid()::text and p.id::text = paciente_id::text
    )
    and (user_id is null or user_id::text = auth.uid()::text)
  );
create policy "evolucoes_delete_own" on public.evolucoes for delete using (
  auth.uid()::text = user_id::text
  or exists (
    select 1 from public.pacientes p
    where p.user_id::text = auth.uid()::text and p.id::text = paciente_id::text
  )
);
