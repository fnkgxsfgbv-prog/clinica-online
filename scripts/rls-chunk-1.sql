do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('pacientes', 'sessoes', 'frequência', 'evolucoes')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  end loop;
end $$;

alter table public.pacientes enable row level security;
alter table public.pacientes force row level security;
alter table public.sessoes enable row level security;
alter table public.sessoes force row level security;
alter table public."frequência" enable row level security;
alter table public."frequência" force row level security;
alter table public.evolucoes enable row level security;
alter table public.evolucoes force row level security;

create policy "pacientes_select_own" on public.pacientes for select using (auth.uid() = user_id);
create policy "pacientes_insert_own" on public.pacientes for insert with check (auth.uid() = user_id);
create policy "pacientes_update_own" on public.pacientes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pacientes_delete_own" on public.pacientes for delete using (auth.uid() = user_id);

create policy "sessoes_select_own" on public.sessoes for select using (auth.uid() = user_id);
create policy "sessoes_insert_own" on public.sessoes for insert with check (auth.uid() = user_id);
create policy "sessoes_update_own" on public.sessoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessoes_delete_own" on public.sessoes for delete using (auth.uid() = user_id);
