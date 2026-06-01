-- Anamnese por paciente: formulário clínico inicial editável.

create table if not exists public.paciente_anamnese (
  id bigserial primary key,
  user_id uuid not null,
  paciente_id text not null,
  queixa_principal text,
  motivo_consulta text,
  historia_atual text,
  historico_psicologico text,
  historico_psiquiatrico text,
  historico_medico text,
  medicamentos text,
  alergias text,
  historico_familiar text,
  desenvolvimento_infancia text,
  sono text,
  alimentacao text,
  rotina text,
  trabalho_estudos text,
  relacionamentos text,
  uso_substancias text,
  risco text,
  objetivos_terapia text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.paciente_anamnese enable row level security;

drop policy if exists "paciente_anamnese_select_own" on public.paciente_anamnese;
drop policy if exists "paciente_anamnese_insert_own" on public.paciente_anamnese;
drop policy if exists "paciente_anamnese_update_own" on public.paciente_anamnese;
drop policy if exists "paciente_anamnese_delete_own" on public.paciente_anamnese;

create policy "paciente_anamnese_select_own"
  on public.paciente_anamnese for select
  using (auth.uid() = user_id);

create policy "paciente_anamnese_insert_own"
  on public.paciente_anamnese for insert
  with check (auth.uid() = user_id);

create policy "paciente_anamnese_update_own"
  on public.paciente_anamnese for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "paciente_anamnese_delete_own"
  on public.paciente_anamnese for delete
  using (auth.uid() = user_id);
