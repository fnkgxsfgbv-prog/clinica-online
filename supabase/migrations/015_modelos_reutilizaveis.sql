-- Modelos reutilizáveis de documentos e formulários.

insert into storage.buckets (id, name, public, file_size_limit)
values ('modelos-arquivos', 'modelos-arquivos', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create table if not exists public.documento_modelos (
  id bigserial primary key,
  user_id uuid not null,
  nome text not null,
  categoria text not null default 'Documento',
  conteudo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.formulario_modelos (
  id bigserial primary key,
  user_id uuid not null,
  nome text not null,
  descricao text,
  campos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modelo_arquivos (
  id bigserial primary key,
  user_id uuid not null,
  tipo text not null check (tipo in ('documento', 'formulario')),
  nome_arquivo text not null,
  storage_path text not null unique,
  tipo_mime text,
  tamanho_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.paciente_formularios (
  id bigserial primary key,
  user_id uuid not null,
  paciente_id text not null,
  modelo_id bigint,
  nome_formulario text not null,
  campos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documento_modelos enable row level security;
alter table public.formulario_modelos enable row level security;
alter table public.modelo_arquivos enable row level security;
alter table public.paciente_formularios enable row level security;

drop policy if exists "documento_modelos_select_own" on public.documento_modelos;
drop policy if exists "documento_modelos_insert_own" on public.documento_modelos;
drop policy if exists "documento_modelos_update_own" on public.documento_modelos;
drop policy if exists "documento_modelos_delete_own" on public.documento_modelos;

create policy "documento_modelos_select_own"
  on public.documento_modelos for select
  using (auth.uid() = user_id);

create policy "documento_modelos_insert_own"
  on public.documento_modelos for insert
  with check (auth.uid() = user_id);

create policy "documento_modelos_update_own"
  on public.documento_modelos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documento_modelos_delete_own"
  on public.documento_modelos for delete
  using (auth.uid() = user_id);

drop policy if exists "formulario_modelos_select_own" on public.formulario_modelos;
drop policy if exists "formulario_modelos_insert_own" on public.formulario_modelos;
drop policy if exists "formulario_modelos_update_own" on public.formulario_modelos;
drop policy if exists "formulario_modelos_delete_own" on public.formulario_modelos;

create policy "formulario_modelos_select_own"
  on public.formulario_modelos for select
  using (auth.uid() = user_id);

create policy "formulario_modelos_insert_own"
  on public.formulario_modelos for insert
  with check (auth.uid() = user_id);

create policy "formulario_modelos_update_own"
  on public.formulario_modelos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "formulario_modelos_delete_own"
  on public.formulario_modelos for delete
  using (auth.uid() = user_id);

drop policy if exists "modelo_arquivos_select_own" on public.modelo_arquivos;
drop policy if exists "modelo_arquivos_insert_own" on public.modelo_arquivos;
drop policy if exists "modelo_arquivos_delete_own" on public.modelo_arquivos;

create policy "modelo_arquivos_select_own"
  on public.modelo_arquivos for select
  using (auth.uid() = user_id);

create policy "modelo_arquivos_insert_own"
  on public.modelo_arquivos for insert
  with check (auth.uid() = user_id);

create policy "modelo_arquivos_delete_own"
  on public.modelo_arquivos for delete
  using (auth.uid() = user_id);

drop policy if exists "paciente_formularios_select_own" on public.paciente_formularios;
drop policy if exists "paciente_formularios_insert_own" on public.paciente_formularios;
drop policy if exists "paciente_formularios_update_own" on public.paciente_formularios;
drop policy if exists "paciente_formularios_delete_own" on public.paciente_formularios;

create policy "paciente_formularios_select_own"
  on public.paciente_formularios for select
  using (auth.uid() = user_id);

create policy "paciente_formularios_insert_own"
  on public.paciente_formularios for insert
  with check (auth.uid() = user_id);

create policy "paciente_formularios_update_own"
  on public.paciente_formularios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "paciente_formularios_delete_own"
  on public.paciente_formularios for delete
  using (auth.uid() = user_id);

create index if not exists documento_modelos_user_idx
  on public.documento_modelos (user_id, updated_at desc);

create index if not exists formulario_modelos_user_idx
  on public.formulario_modelos (user_id, updated_at desc);

create index if not exists modelo_arquivos_user_tipo_idx
  on public.modelo_arquivos (user_id, tipo, created_at desc);

create index if not exists paciente_formularios_user_paciente_idx
  on public.paciente_formularios (user_id, paciente_id, updated_at desc);

drop policy if exists "modelos_arquivos_storage_select_own" on storage.objects;
drop policy if exists "modelos_arquivos_storage_insert_own" on storage.objects;
drop policy if exists "modelos_arquivos_storage_update_own" on storage.objects;
drop policy if exists "modelos_arquivos_storage_delete_own" on storage.objects;

create policy "modelos_arquivos_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'modelos-arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "modelos_arquivos_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'modelos-arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "modelos_arquivos_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'modelos-arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'modelos-arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "modelos_arquivos_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'modelos-arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
