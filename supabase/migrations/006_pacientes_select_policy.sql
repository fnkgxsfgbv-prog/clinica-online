-- Corrige leitura de pacientes (policy SELECT ausente após RLS parcial).

drop policy if exists "pacientes_select_own" on public.pacientes;

create policy "pacientes_select_own"
  on public.pacientes for select
  using (auth.uid()::text = user_id);
