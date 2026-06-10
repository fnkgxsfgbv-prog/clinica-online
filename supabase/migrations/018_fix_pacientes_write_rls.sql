-- Alinha INSERT/UPDATE/DELETE de pacientes com SELECT (user_id como texto).

drop policy if exists "pacientes_insert_own" on public.pacientes;
drop policy if exists "pacientes_update_own" on public.pacientes;
drop policy if exists "pacientes_delete_own" on public.pacientes;

create policy "pacientes_insert_own"
  on public.pacientes for insert
  with check (auth.uid()::text = user_id);

create policy "pacientes_update_own"
  on public.pacientes for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy "pacientes_delete_own"
  on public.pacientes for delete
  using (auth.uid()::text = user_id);
