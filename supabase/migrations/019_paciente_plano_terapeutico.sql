-- Plano terapêutico único por paciente (documento vivo do tratamento).

create table if not exists public.paciente_plano_terapeutico (
  id bigserial primary key,
  user_id uuid not null,
  paciente_id text not null,
  conteudo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists paciente_plano_terapeutico_user_paciente_uidx
  on public.paciente_plano_terapeutico (user_id, paciente_id);

alter table public.paciente_plano_terapeutico enable row level security;

drop policy if exists "paciente_plano_terapeutico_select_own" on public.paciente_plano_terapeutico;
drop policy if exists "paciente_plano_terapeutico_insert_own" on public.paciente_plano_terapeutico;
drop policy if exists "paciente_plano_terapeutico_update_own" on public.paciente_plano_terapeutico;
drop policy if exists "paciente_plano_terapeutico_delete_own" on public.paciente_plano_terapeutico;

create policy "paciente_plano_terapeutico_select_own"
  on public.paciente_plano_terapeutico for select
  using (auth.uid() = user_id);

create policy "paciente_plano_terapeutico_insert_own"
  on public.paciente_plano_terapeutico for insert
  with check (auth.uid() = user_id);

create policy "paciente_plano_terapeutico_update_own"
  on public.paciente_plano_terapeutico for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "paciente_plano_terapeutico_delete_own"
  on public.paciente_plano_terapeutico for delete
  using (auth.uid() = user_id);
