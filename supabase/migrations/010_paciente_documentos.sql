-- Documentos por paciente.
-- Arquivos ficam no Supabase Storage privado; esta tabela guarda metadados.

insert into storage.buckets (id, name, public, file_size_limit)
values ('paciente-documentos', 'paciente-documentos', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create table if not exists public.paciente_documentos (
  id bigserial primary key,
  user_id uuid not null,
  paciente_id text not null,
  nome_arquivo text not null,
  storage_path text not null unique,
  tipo_mime text,
  tamanho_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.paciente_documentos enable row level security;

drop policy if exists "paciente_documentos_select_own" on public.paciente_documentos;
drop policy if exists "paciente_documentos_insert_own" on public.paciente_documentos;
drop policy if exists "paciente_documentos_delete_own" on public.paciente_documentos;

create policy "paciente_documentos_select_own"
  on public.paciente_documentos for select
  using (auth.uid() = user_id);

create policy "paciente_documentos_insert_own"
  on public.paciente_documentos for insert
  with check (auth.uid() = user_id);

create policy "paciente_documentos_delete_own"
  on public.paciente_documentos for delete
  using (auth.uid() = user_id);

create index if not exists paciente_documentos_user_paciente_idx
  on public.paciente_documentos (user_id, paciente_id, created_at desc);

drop policy if exists "paciente_documentos_storage_select_own" on storage.objects;
drop policy if exists "paciente_documentos_storage_insert_own" on storage.objects;
drop policy if exists "paciente_documentos_storage_delete_own" on storage.objects;

create policy "paciente_documentos_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'paciente-documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "paciente_documentos_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'paciente-documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "paciente_documentos_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'paciente-documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
