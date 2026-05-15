-- Execute via: npm run security:apply-rls (com SUPABASE_ACCESS_TOKEN no .env.local)
-- ou cole no SQL Editor do Supabase (Dashboard → SQL → New query).

-- Remove policies antigas (ex.: acesso público) antes de criar as novas
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

-- Pacientes
drop policy if exists "pacientes_select_own" on public.pacientes;
drop policy if exists "pacientes_insert_own" on public.pacientes;
drop policy if exists "pacientes_update_own" on public.pacientes;
drop policy if exists "pacientes_delete_own" on public.pacientes;

create policy "pacientes_select_own"
  on public.pacientes for select
  using (auth.uid()::text = user_id);

create policy "pacientes_insert_own"
  on public.pacientes for insert
  with check (auth.uid() = user_id);

create policy "pacientes_update_own"
  on public.pacientes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pacientes_delete_own"
  on public.pacientes for delete
  using (auth.uid() = user_id);

-- Sessões
drop policy if exists "sessoes_select_own" on public.sessoes;
drop policy if exists "sessoes_insert_own" on public.sessoes;
drop policy if exists "sessoes_update_own" on public.sessoes;
drop policy if exists "sessoes_delete_own" on public.sessoes;

create policy "sessoes_select_own"
  on public.sessoes for select
  using (auth.uid() = user_id);

create policy "sessoes_insert_own"
  on public.sessoes for insert
  with check (auth.uid() = user_id);

create policy "sessoes_update_own"
  on public.sessoes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessoes_delete_own"
  on public.sessoes for delete
  using (auth.uid() = user_id);

-- Frequência (nome com acento)
drop policy if exists "frequencia_select_own" on public."frequência";
drop policy if exists "frequencia_insert_own" on public."frequência";
drop policy if exists "frequencia_update_own" on public."frequência";
drop policy if exists "frequencia_delete_own" on public."frequência";

create policy "frequencia_select_own"
  on public."frequência" for select
  using (auth.uid() = user_id);

create policy "frequencia_insert_own"
  on public."frequência" for insert
  with check (auth.uid() = user_id);

create policy "frequencia_update_own"
  on public."frequência" for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "frequencia_delete_own"
  on public."frequência" for delete
  using (auth.uid() = user_id);

-- Evoluções
drop policy if exists "evolucoes_select_own" on public.evolucoes;
drop policy if exists "evolucoes_insert_own" on public.evolucoes;
drop policy if exists "evolucoes_update_own" on public.evolucoes;
drop policy if exists "evolucoes_delete_own" on public.evolucoes;

create policy "evolucoes_select_own"
  on public.evolucoes for select
  using (auth.uid() = user_id);

create policy "evolucoes_insert_own"
  on public.evolucoes for insert
  with check (auth.uid() = user_id);

create policy "evolucoes_update_own"
  on public.evolucoes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "evolucoes_delete_own"
  on public.evolucoes for delete
  using (auth.uid() = user_id);
